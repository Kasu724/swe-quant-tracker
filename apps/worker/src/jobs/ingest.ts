import { readBaseEnv, readWorkerEnv } from "@faang-quant/config";
import {
  prisma,
  IngestionRunStatus,
  type CompanySource,
  type InternshipPosting,
  type Prisma
} from "@faang-quant/db";
import {
  getAdapter,
  isPotentialDuplicate,
  normalizeFetchedPosting,
  type NormalizedLocation
} from "@faang-quant/shared";
import { subDays } from "date-fns";
import { sendImmediateAlertsForPostings } from "../lib/alerts";
import { runWithConcurrency } from "../lib/concurrency";
import { logger } from "../lib/logger";

type SourceWithCompany = Prisma.CompanySourceGetPayload<{
  include: {
    company: true;
  };
}>;

type PostingWithCanonicalSource = Prisma.InternshipPostingGetPayload<{
  include: {
    canonicalSource: true;
  };
}>;

function toObject(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function extractLocationKeys(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return undefined;
      }

      return (entry as NormalizedLocation).key;
    })
    .filter((key): key is string => Boolean(key));
}

function shouldPromoteCanonical(existing: PostingWithCanonicalSource, incomingSource: CompanySource): boolean {
  if (!existing.canonicalSourceId || !existing.canonicalSource) {
    return true;
  }

  return incomingSource.priority <= existing.canonicalSource.priority;
}

function buildCanonicalData(input: {
  normalized: ReturnType<typeof normalizeFetchedPosting>;
  companyId: string;
  companyName: string;
  sourceId: string;
}) {
  const normalized = input.normalized;

  return {
    slug: normalized.slug,
    companyId: input.companyId,
    canonicalSourceId: input.sourceId,
    externalJobId: normalized.externalJobId,
    companyNameSnapshot: input.companyName,
    title: normalized.title,
    normalizedTitle: normalized.normalizedTitle,
    roleCategory: normalized.roleCategory,
    internshipFlag: normalized.internshipFlag,
    season: normalized.season,
    year: normalized.year,
    employmentType: normalized.employmentType,
    locationRaw: normalized.locationRaw,
    locationsNormalized: normalized.locationsNormalized as Prisma.InputJsonValue,
    locationCountries: normalized.locationCountries,
    remoteType: normalized.remoteType,
    compensationMin: normalized.compensationMin,
    compensationMax: normalized.compensationMax,
    compensationCurrency: normalized.compensationCurrency,
    compensationInterval: normalized.compensationInterval,
    payRaw: normalized.payRaw,
    postingDate: normalized.postingDate,
    lastSeenAt: new Date(),
    applicationUrl: normalized.applicationUrl,
    sourceUrl: normalized.sourceUrl,
    sourceType: normalized.sourceType,
    sourceName: normalized.sourceName,
    isActive: true,
    dedupeFingerprint: normalized.dedupeFingerprint,
    descriptionRaw: normalized.descriptionRaw,
    descriptionText: normalized.descriptionText,
    requirementsText: normalized.requirementsText,
    metadataJson: (normalized.metadataJson ?? undefined) as Prisma.InputJsonValue | undefined,
    rawPostingJson: normalized.rawPostingJson as Prisma.InputJsonValue
  };
}

async function persistPosting(input: {
  source: SourceWithCompany;
  normalized: ReturnType<typeof normalizeFetchedPosting>;
}): Promise<{ postingId: string; discovered: boolean }> {
  const { source, normalized } = input;
  const canonicalData = buildCanonicalData({
    normalized,
    companyId: source.companyId,
    companyName: source.company.name,
    sourceId: source.id
  });

  return prisma.$transaction(async (tx) => {
    const existingSourceRecord = await tx.postingSourceRecord.findUnique({
      where: {
        companySourceId_externalJobId: {
          companySourceId: source.id,
          externalJobId: normalized.externalJobId
        }
      },
      include: {
        internshipPosting: {
          include: {
            canonicalSource: true
          }
        }
      }
    });

    if (existingSourceRecord) {
      const promote = shouldPromoteCanonical(existingSourceRecord.internshipPosting, source);
      const { slug: _ignoredSlug, ...canonicalUpdate } = canonicalData;

      await tx.postingSourceRecord.update({
        where: { id: existingSourceRecord.id },
        data: {
          lastSeenAt: new Date(),
          sourceUrl: normalized.sourceUrl,
          applicationUrl: normalized.applicationUrl,
          rawPayloadJson: normalized.rawPostingJson as Prisma.InputJsonValue
        }
      });

      await tx.internshipPosting.update({
        where: { id: existingSourceRecord.internshipPostingId },
        data: promote
          ? {
              ...canonicalUpdate,
              canonicalSourceId: source.id
            }
          : {
              lastSeenAt: new Date(),
              isActive: true
            }
      });

      return {
        postingId: existingSourceRecord.internshipPostingId,
        discovered: false
      };
    }

    const candidates = await tx.internshipPosting.findMany({
      where: {
        companyId: source.companyId,
        OR: [
          { dedupeFingerprint: normalized.dedupeFingerprint },
          { normalizedTitle: normalized.normalizedTitle }
        ]
      },
      include: {
        canonicalSource: true
      },
      orderBy: {
        discoveredAt: "desc"
      },
      take: 25
    });

    const duplicate = candidates.find((candidate) =>
      candidate.dedupeFingerprint === normalized.dedupeFingerprint ||
      isPotentialDuplicate(
        {
          companyName: source.company.name,
          title: normalized.title,
          normalizedTitle: normalized.normalizedTitle,
          locationKeys: normalized.locationsNormalized.map((location) => location.key),
          season: normalized.season,
          year: normalized.year,
          postingDate: normalized.postingDate
        },
        {
          companyName: candidate.companyNameSnapshot,
          title: candidate.title,
          normalizedTitle: candidate.normalizedTitle,
          locationKeys: extractLocationKeys(candidate.locationsNormalized),
          season: candidate.season,
          year: candidate.year,
          postingDate: candidate.postingDate
        }
      )
    );

    if (duplicate) {
      const promote = shouldPromoteCanonical(duplicate, source);
      const { slug: _ignoredSlug, ...canonicalUpdate } = canonicalData;

      await tx.postingSourceRecord.create({
        data: {
          internshipPostingId: duplicate.id,
          companySourceId: source.id,
          externalJobId: normalized.externalJobId,
          rawPayloadJson: normalized.rawPostingJson as Prisma.InputJsonValue,
          sourceUrl: normalized.sourceUrl,
          applicationUrl: normalized.applicationUrl
        }
      });

      await tx.internshipPosting.update({
        where: { id: duplicate.id },
        data: promote
          ? {
              ...canonicalUpdate,
              canonicalSourceId: source.id
            }
          : {
              lastSeenAt: new Date(),
              isActive: true
            }
      });

      return {
        postingId: duplicate.id,
        discovered: false
      };
    }

    const created = await tx.internshipPosting.create({
      data: {
        ...canonicalData,
        discoveredAt: new Date()
      }
    });

    await tx.postingSourceRecord.create({
      data: {
        internshipPostingId: created.id,
        companySourceId: source.id,
        externalJobId: normalized.externalJobId,
        rawPayloadJson: normalized.rawPostingJson as Prisma.InputJsonValue,
        sourceUrl: normalized.sourceUrl,
        applicationUrl: normalized.applicationUrl
      }
    });

    return {
      postingId: created.id,
      discovered: true
    };
  });
}

async function processSource(source: SourceWithCompany): Promise<string[]> {
  const run = await prisma.ingestionRun.create({
    data: {
      sourceType: source.sourceType,
      companySourceId: source.id,
      status: IngestionRunStatus.RUNNING
    }
  });

  const adapter = getAdapter(source.sourceType);
  const discoveredPostingIds: string[] = [];
  const stats = {
    fetched: 0,
    skipped: 0,
    normalized: 0,
    discovered: 0,
    updated: 0
  };

  try {
    const postings = await adapter.fetchPostings({
      company: {
        id: source.company.id,
        name: source.company.name,
        slug: source.company.slug
      },
      source: {
        id: source.id,
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        sourceIdentifier: source.sourceIdentifier,
        sourceUrl: source.sourceUrl,
        requestConfigJson: toObject(source.requestConfigJson),
        parserConfigJson: toObject(source.parserConfigJson)
      }
    });

    stats.fetched = postings.length;

    for (const posting of postings) {
      const normalized = normalizeFetchedPosting({
        company: {
          id: source.company.id,
          name: source.company.name,
          slug: source.company.slug
        },
        source: {
          id: source.id,
          sourceType: source.sourceType,
          sourceName: source.sourceName,
          sourceIdentifier: source.sourceIdentifier,
          sourceUrl: source.sourceUrl,
          requestConfigJson: toObject(source.requestConfigJson),
          parserConfigJson: toObject(source.parserConfigJson)
        },
        posting
      });

      if (!normalized.internshipFlag || !normalized.applicationUrl) {
        stats.skipped += 1;
        continue;
      }

      stats.normalized += 1;

      const result = await persistPosting({
        source,
        normalized
      });

      if (result.discovered) {
        stats.discovered += 1;
        discoveredPostingIds.push(result.postingId);
      } else {
        stats.updated += 1;
      }
    }

    await prisma.companySource.update({
      where: { id: source.id },
      data: {
        lastPolledAt: new Date()
      }
    });

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: IngestionRunStatus.SUCCESS,
        finishedAt: new Date(),
        statsJson: stats as Prisma.InputJsonValue
      }
    });

    return discoveredPostingIds;
  } catch (error) {
    logger.error({ error, sourceId: source.id }, "Source ingestion failed");

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: IngestionRunStatus.FAILED,
        finishedAt: new Date(),
        statsJson: stats as Prisma.InputJsonValue,
        errorText: error instanceof Error ? error.message : "Unknown ingestion error"
      }
    });

    return [];
  }
}

async function deactivateStalePostings() {
  const env = readBaseEnv();
  const staleBefore = subDays(new Date(), env.POSTING_STALE_DAYS);
  const result = await prisma.internshipPosting.updateMany({
    where: {
      isActive: true,
      lastSeenAt: {
        lt: staleBefore
      }
    },
    data: {
      isActive: false
    }
  });

  return result.count;
}

export async function runIngestionCycle(options?: { sourceId?: string }) {
  const env = readWorkerEnv();
  const sources = await prisma.companySource.findMany({
    where: {
      isActive: true,
      pollingEnabled: true,
      ...(options?.sourceId ? { id: options.sourceId } : {}),
      company: {
        isActive: true
      }
    },
    include: {
      company: true
    },
    orderBy: [
      { priority: "asc" },
      { createdAt: "asc" }
    ]
  });

  if (sources.length === 0) {
    logger.info("No active sources available for ingestion");
    return;
  }

  const discoveredPostingIds: string[] = [];

  await runWithConcurrency(
    sources,
    options?.sourceId ? 1 : env.INGESTION_CONCURRENCY,
    async (source) => {
      const discovered = await processSource(source);
      discoveredPostingIds.push(...discovered);
    }
  );

  const staleCount = await deactivateStalePostings();
  await sendImmediateAlertsForPostings(discoveredPostingIds);

  logger.info(
    {
      sourcesProcessed: sources.length,
      discovered: discoveredPostingIds.length,
      staleMarkedInactive: staleCount
    },
    "Ingestion cycle completed"
  );
}
