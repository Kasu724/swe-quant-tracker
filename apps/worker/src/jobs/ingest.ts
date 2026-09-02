import { readBaseEnv, readWorkerEnv } from "@faang-quant/config";
import {
  prisma,
  IngestionRunStatus,
  type CompanySource,
  type InternshipPosting,
  type Prisma
} from "@faang-quant/db";
import {
  getPreferredPostingUrl,
  getAdapter,
  isUsOrUnknownPostingLocation,
  isPotentialDuplicate,
  normalizeFetchedPosting,
  type AdapterFetchedPosting,
  type NormalizedPostingRecord,
  type NormalizedLocation
} from "@faang-quant/shared";
import { subDays } from "date-fns";
import { sendImmediateAlertsForPostings } from "../lib/alerts";
import { mapWithConcurrency, runWithConcurrency } from "../lib/concurrency";
import {
  readDiscordDeliveryConfiguration,
  runDiscordNotificationCycle
} from "../lib/discord";
import { resolvePostingUrl } from "../lib/link-health";
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

type IngestionTimingOptions = {
  requestTimeoutMs: number;
  sourceTimeoutMs: number;
  urlValidationConcurrency: number;
  discordNotificationEligible: boolean;
};

type SourceProcessingResult = {
  discoveredPostingIds: string[];
  status: "success" | "partial" | "failed";
};

type IngestionStats = {
  fetched: number;
  skipped: number;
  normalized: number;
  discovered: number;
  updated: number;
  failed: number;
  timingsMs: {
    fetch: number;
    preparationValidation: number;
    persistence: number;
    total: number;
  };
};

type PreparedPosting = {
  posting: AdapterFetchedPosting;
  normalized: NormalizedPostingRecord;
};

type ValidatedPosting =
  | { kind: "accepted"; posting: AdapterFetchedPosting; normalized: NormalizedPostingRecord }
  | { kind: "skipped"; posting: AdapterFetchedPosting }
  | { kind: "failed"; posting: AdapterFetchedPosting; error: unknown };

export type IngestionProgress = {
  phase: "running" | "completed";
  totalSources: number;
  completedSources: number;
  activeSources: string[];
  discovered: number;
  failedSources: number;
  partialSources: number;
};

type IngestionCycleOptions = {
  sourceId?: string;
  onProgress?: (progress: IngestionProgress) => void;
};

function toObject(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readBooleanConfig(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return fallback;
}

function readPositiveNumberConfig(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function abortReasonToError(reason: unknown, fallbackMessage: string): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof reason === "string" && reason.trim()) {
    return new Error(reason);
  }

  return new Error(fallbackMessage);
}

function throwIfSourceAborted(signal: AbortSignal, source: SourceWithCompany) {
  if (!signal.aborted) {
    return;
  }

  throw abortReasonToError(
    signal.reason,
    `Source ingestion aborted: ${source.company.name} (${source.sourceName})`
  );
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

function stablePostingDate(
  existing: Pick<InternshipPosting, "postingDate" | "discoveredAt">,
  incoming?: Date
): Date | undefined {
  const knownPostingDates = [existing.postingDate, incoming].filter(
    (date): date is Date => Boolean(date)
  );

  if (knownPostingDates.length === 0) {
    return undefined;
  }

  // Some ATS feeds expose a mutable "updated" timestamp as their only date.
  // Keep the earliest value ever observed and never allow a posting date after
  // the time the tracker had already discovered the job.
  return new Date(
    Math.min(
      existing.discoveredAt.getTime(),
      ...knownPostingDates.map((date) => date.getTime())
    )
  );
}

function postingDateAtDiscovery(incoming: Date | undefined, discoveredAt: Date): Date | undefined {
  if (!incoming) {
    return undefined;
  }

  return incoming.getTime() <= discoveredAt.getTime() ? incoming : discoveredAt;
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
    applicationUrl:
      getPreferredPostingUrl({
        sourceUrl: normalized.sourceUrl,
        applicationUrl: normalized.applicationUrl
      }) ?? normalized.applicationUrl,
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

export async function persistPosting(input: {
  source: SourceWithCompany;
  normalized: ReturnType<typeof normalizeFetchedPosting>;
  discordNotificationEligible: boolean;
}): Promise<{ postingId: string; discovered: boolean }> {
  const { source, normalized } = input;
  const canonicalData = buildCanonicalData({
    normalized,
    companyId: source.companyId,
    companyName: source.company.name,
    sourceId: source.id
  });

  return prisma.$transaction(async (tx) => {
    // Different sources for the same company can run concurrently. Lock the company while
    // matching and creating so two transactions cannot both decide the same posting is new.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`internship-ingest:${source.companyId}`}))`;

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

      canonicalUpdate.postingDate = stablePostingDate(
        existingSourceRecord.internshipPosting,
        normalized.postingDate
      );

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

      canonicalUpdate.postingDate = stablePostingDate(duplicate, normalized.postingDate);

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

    const discoveredAt = new Date();
    const created = await tx.internshipPosting.create({
      data: {
        ...canonicalData,
        postingDate: postingDateAtDiscovery(normalized.postingDate, discoveredAt),
        discoveredAt
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

    // A notification intent is created only with a brand-new canonical posting.
    // Repeat polls update the posting above and must never enqueue another send.
    await tx.discordNotification.create({
      data: {
        internshipPostingId: created.id,
        eligibleForDelivery: input.discordNotificationEligible
      }
    });

    return {
      postingId: created.id,
      discovered: true
    };
  });
}

async function processSource(
  source: SourceWithCompany,
  options: IngestionTimingOptions
): Promise<SourceProcessingResult> {
  const requestConfig = toObject(source.requestConfigJson);
  const requestTimeoutMs = readPositiveNumberConfig(
    requestConfig?.requestTimeoutMs,
    options.requestTimeoutMs
  );
  const sourceTimeoutMs = readPositiveNumberConfig(
    requestConfig?.sourceTimeoutMs,
    options.sourceTimeoutMs
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(
      new Error(
        `Source ingestion timed out after ${sourceTimeoutMs}ms: ${source.company.name} (${source.sourceName})`
      )
    );
  }, sourceTimeoutMs);

  const run = await prisma.ingestionRun.create({
    data: {
      sourceType: source.sourceType,
      companySourceId: source.id,
      status: IngestionRunStatus.RUNNING
    }
  });

  const discoveredPostingIds: string[] = [];
  const totalStartedAt = Date.now();
  let activePhase: keyof IngestionStats["timingsMs"] | undefined;
  let activePhaseStartedAt: number | undefined;
  const stats: IngestionStats = {
    fetched: 0,
    skipped: 0,
    normalized: 0,
    discovered: 0,
    updated: 0,
    failed: 0,
    timingsMs: {
      fetch: 0,
      preparationValidation: 0,
      persistence: 0,
      total: 0
    }
  };
  const beginPhase = (phase: keyof IngestionStats["timingsMs"]) => {
    activePhase = phase;
    activePhaseStartedAt = Date.now();
  };
  const endPhase = () => {
    if (activePhase && activePhaseStartedAt !== undefined) {
      stats.timingsMs[activePhase] = Date.now() - activePhaseStartedAt;
    }

    activePhase = undefined;
    activePhaseStartedAt = undefined;
  };

  try {
    const adapter = getAdapter(source.sourceType);
    logger.info(
      {
        sourceId: source.id,
        company: source.company.name,
        sourceName: source.sourceName,
        requestTimeoutMs,
        sourceTimeoutMs,
        urlValidationConcurrency: options.urlValidationConcurrency
      },
      "Starting source ingestion"
    );

    beginPhase("fetch");
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
        requestConfigJson: requestConfig,
        parserConfigJson: toObject(source.parserConfigJson)
      },
      requestTimeoutMs,
      signal: controller.signal
    });

    throwIfSourceAborted(controller.signal, source);
    endPhase();
    stats.fetched = postings.length;

    beginPhase("preparationValidation");
    const preparedPostings: PreparedPosting[] = [];

    for (const posting of postings) {
      try {
        throwIfSourceAborted(controller.signal, source);

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

        if (
          !normalized.internshipFlag ||
          !isUsOrUnknownPostingLocation(normalized.locationCountries) ||
          !normalized.applicationUrl
        ) {
          stats.skipped += 1;
          continue;
        }

        preparedPostings.push({ posting, normalized });
      } catch (error) {
        throwIfSourceAborted(controller.signal, source);
        stats.failed += 1;
        logger.error(
          {
            error,
            sourceId: source.id,
            company: source.company.name,
            externalJobId: posting.externalJobId
          },
          "Skipping a posting that failed normalization or persistence"
        );
      }
    }

    const validatedPostings = readBooleanConfig(requestConfig?.validatePostingUrls, false)
      ? await mapWithConcurrency(
          preparedPostings,
          options.urlValidationConcurrency,
          async ({ posting, normalized }): Promise<ValidatedPosting> => {
            try {
              throwIfSourceAborted(controller.signal, source);

              const resolution = await resolvePostingUrl(
                {
                  sourceUrl: normalized.sourceUrl,
                  applicationUrl: normalized.applicationUrl
                },
                {
                  signal: controller.signal,
                  timeoutMs: requestTimeoutMs
                }
              );

              throwIfSourceAborted(controller.signal, source);

              if (!resolution.url && resolution.conclusiveDead) {
                return { kind: "skipped", posting };
              }

              if (resolution.url) {
                normalized.applicationUrl = resolution.url;
              } else {
                logger.warn(
                  {
                    sourceId: source.id,
                    company: source.company.name,
                    externalJobId: normalized.externalJobId
                  },
                  "Keeping posting after inconclusive URL validation"
                );
              }

              return { kind: "accepted", posting, normalized };
            } catch (error) {
              throwIfSourceAborted(controller.signal, source);
              return { kind: "failed", posting, error };
            }
          }
        )
      : preparedPostings.map(({ posting, normalized }) => ({
          kind: "accepted" as const,
          posting,
          normalized
        }));

    throwIfSourceAborted(controller.signal, source);
    endPhase();

    beginPhase("persistence");
    for (const result of validatedPostings) {
      throwIfSourceAborted(controller.signal, source);

      if (result.kind === "skipped") {
        stats.skipped += 1;
        continue;
      }

      if (result.kind === "failed") {
        stats.failed += 1;
        logger.error(
          {
            error: result.error,
            sourceId: source.id,
            company: source.company.name,
            externalJobId: result.posting.externalJobId
          },
          "Skipping a posting that failed normalization or persistence"
        );
        continue;
      }

      stats.normalized += 1;

      try {
        const persisted = await persistPosting({
          source,
          normalized: result.normalized,
          discordNotificationEligible: options.discordNotificationEligible
        });

        if (persisted.discovered) {
          stats.discovered += 1;
          discoveredPostingIds.push(persisted.postingId);
        } else {
          stats.updated += 1;
        }
      } catch (error) {
        throwIfSourceAborted(controller.signal, source);
        stats.failed += 1;
        logger.error(
          {
            error,
            sourceId: source.id,
            company: source.company.name,
            externalJobId: result.posting.externalJobId
          },
          "Skipping a posting that failed normalization or persistence"
        );
      }
    }
    endPhase();

    await prisma.companySource.update({
      where: { id: source.id },
      data: {
        lastPolledAt: new Date()
      }
    });

    stats.timingsMs.total = Date.now() - totalStartedAt;

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: stats.failed > 0 ? IngestionRunStatus.PARTIAL : IngestionRunStatus.SUCCESS,
        finishedAt: new Date(),
        statsJson: stats as Prisma.InputJsonValue
      }
    });

    logger.info(
      {
        sourceId: source.id,
        company: source.company.name,
        sourceName: source.sourceName,
        stats
      },
      "Source ingestion completed"
    );

    return {
      discoveredPostingIds,
      status: stats.failed > 0 ? "partial" : "success"
    };
  } catch (error) {
    endPhase();
    stats.timingsMs.total = Date.now() - totalStartedAt;
    logger.error(
      {
        error,
        sourceId: source.id,
        company: source.company.name,
        sourceName: source.sourceName,
        stats
      },
      "Source ingestion failed"
    );

    try {
      await prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: IngestionRunStatus.FAILED,
          finishedAt: new Date(),
          statsJson: stats as Prisma.InputJsonValue,
          errorText: error instanceof Error ? error.message : "Unknown ingestion error"
        }
      });
    } catch (updateError) {
      logger.error(
        { error: updateError, ingestionRunId: run.id },
        "Could not record failed ingestion run"
      );
    }

    return { discoveredPostingIds, status: "failed" };
  } finally {
    clearTimeout(timeout);
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

async function markAbandonedIngestionRuns(sourceTimeoutMs: number) {
  const abandonedBefore = new Date(Date.now() - Math.max(sourceTimeoutMs * 2, 5 * 60_000));
  const result = await prisma.ingestionRun.updateMany({
    where: {
      status: IngestionRunStatus.RUNNING,
      startedAt: {
        lt: abandonedBefore
      }
    },
    data: {
      status: IngestionRunStatus.FAILED,
      finishedAt: new Date(),
      errorText: "Marked failed because the worker process exited before completing this source"
    }
  });

  if (result.count > 0) {
    logger.warn({ count: result.count }, "Marked abandoned ingestion runs as failed");
  }
}

export async function runIngestionCycle(options?: IngestionCycleOptions) {
  const env = readWorkerEnv();
  await markAbandonedIngestionRuns(env.INGESTION_SOURCE_TIMEOUT_MS);

  // Snapshot Discord eligibility at the beginning of the cycle. A posting is
  // only deliverable when Discord is active for its company at first ingest;
  // enabling Discord later must not release a historical backlog.
  const discordConfiguration = await readDiscordDeliveryConfiguration(env);

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
    options?.onProgress?.({
      phase: "completed",
      totalSources: 0,
      completedSources: 0,
      activeSources: [],
      discovered: 0,
      failedSources: 0,
      partialSources: 0
    });
    return {
      sourcesProcessed: 0,
      discovered: 0,
      staleMarkedInactive: 0,
      failedSources: 0,
      partialSources: 0
    };
  }

  const discoveredPostingIds: string[] = [];
  let failedSources = 0;
  let partialSources = 0;
  let completedSources = 0;
  const activeSources = new Set<string>();
  const reportProgress = (phase: IngestionProgress["phase"]) => {
    options?.onProgress?.({
      phase,
      totalSources: sources.length,
      completedSources,
      activeSources: Array.from(activeSources),
      discovered: discoveredPostingIds.length,
      failedSources,
      partialSources
    });
  };

  reportProgress("running");

  // Sources are processed concurrently, but Discord drains must be serialized
  // so that a fast source can notify immediately without racing another
  // source's outbox claim. Each scheduled drain starts as soon as the prior
  // one completes; failures are logged and never abort ingestion.
  let discordDrainChain: Promise<void> = Promise.resolve();
  const scheduleDiscordDrain = (reason: string) => {
    discordDrainChain = discordDrainChain.then(async () => {
      try {
        await runDiscordNotificationCycle();
      } catch (error) {
        logger.error(
          { error, reason },
          "Discord notification drain failed; durable outbox delivery will be retried"
        );
      }
    });

    return discordDrainChain;
  };

  await runWithConcurrency(
    sources,
    options?.sourceId ? 1 : env.INGESTION_CONCURRENCY,
    async (source) => {
      const sourceLabel = `${source.company.name} · ${source.sourceName}`;
      activeSources.add(sourceLabel);
      reportProgress("running");
      try {
        const result = await processSource(source, {
          requestTimeoutMs: env.INGESTION_REQUEST_TIMEOUT_MS,
          sourceTimeoutMs: env.INGESTION_SOURCE_TIMEOUT_MS,
          urlValidationConcurrency: env.INGESTION_URL_VALIDATION_CONCURRENCY,
          discordNotificationEligible: Boolean(
            discordConfiguration &&
              (discordConfiguration.companyIds === null ||
                discordConfiguration.companyIds.includes(source.companyId))
          )
        });
        discoveredPostingIds.push(...result.discoveredPostingIds);

        if (result.discoveredPostingIds.length > 0) {
          // Do not await here: the next source may continue ingesting while
          // this serialized drain sends the newly committed postings.
          void scheduleDiscordDrain(`source:${source.id}`);
        }

        if (result.status === "failed") {
          failedSources += 1;
        } else if (result.status === "partial") {
          partialSources += 1;
        }
      } catch (error) {
        failedSources += 1;
        logger.error(
          { error, sourceId: source.id, company: source.company.name },
          "Source ingestion could not be started"
        );
      } finally {
        activeSources.delete(sourceLabel);
        completedSources += 1;
        reportProgress("running");
      }
    }
  );

  const completeFullCycle = !options?.sourceId && failedSources === 0 && partialSources === 0;
  const staleCount = completeFullCycle ? await deactivateStalePostings() : 0;

  if (!completeFullCycle) {
    logger.warn(
      { failedSources, partialSources, targetedSourceId: options?.sourceId },
      "Skipped stale-posting deactivation because the ingestion cycle was incomplete"
    );
  }

  // Always enqueue a final sweep after all source-triggered drains. This
  // catches rows left by an interrupted source and preserves the cron job as a
  // later recovery path without delaying ingestion on transient failures.
  const finalDiscordDrain = scheduleDiscordDrain("cycle-final");

  // Drain the durable Discord outbox as soon as this cycle has committed its
  // postings. The cron job remains as a retry/recovery path, while configured
  // destinations receive new postings without waiting for the next minute.
  const notificationResults = await Promise.allSettled([
    sendImmediateAlertsForPostings(discoveredPostingIds),
    finalDiscordDrain
  ]);

  for (const [index, result] of notificationResults.entries()) {
    if (result.status === "rejected") {
      logger.error(
        {
          error: result.reason,
          channel: index === 0 ? "email" : "discord",
          notificationIndex: index
        },
        "Post-ingestion notification dispatch failed"
      );
    }
  }

  logger.info(
    {
      sourcesProcessed: sources.length,
      discovered: discoveredPostingIds.length,
      staleMarkedInactive: staleCount,
      failedSources,
      partialSources
    },
    "Ingestion cycle completed"
  );
  reportProgress("completed");

  return {
    sourcesProcessed: sources.length,
    discovered: discoveredPostingIds.length,
    staleMarkedInactive: staleCount,
    failedSources,
    partialSources
  };
}
