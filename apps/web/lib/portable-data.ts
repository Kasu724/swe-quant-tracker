import { listingFilterSchema } from "@swe-quant/shared";
import { Prisma, prisma } from "@swe-quant/db";
import { z } from "zod";
import { getLocalProfile, isPlaceholderLocalEmail } from "./local-profile";

export const PORTABLE_DATA_FORMAT = "swe-quant-tracker-backup";
export const PORTABLE_DATA_VERSION = 1;

const sourceTypeSchema = z.enum([
  "GREENHOUSE",
  "LEVER",
  "ASHBY",
  "WORKDAY",
  "CUSTOM_HTML",
  "CUSTOM_API",
  "BROWSER_AUTOMATION"
]);
const companyBucketSchema = z.enum(["FAANG", "BIG_TECH", "QUANT", "TRADING", "HEDGE_FUND", "OTHER"]);
const applicationStateSchema = z.enum(["APPLIED", "HIDDEN"]);
const httpUrlSchema = z.string().url().max(4096).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "URL must use HTTP or HTTPS");

const postingReferenceSchema = z.object({
  slug: z.string().min(1).max(512),
  companySlug: z.string().min(1).max(255),
  externalJobId: z.string().max(512).nullable(),
  applicationUrl: httpUrlSchema
});

export const portableDataSchema = z.object({
  format: z.literal(PORTABLE_DATA_FORMAT),
  version: z.literal(PORTABLE_DATA_VERSION),
  exportedAt: z.string().datetime(),
  settings: z.object({
    theme: z.enum(["light", "dark", "system"]).default("system"),
    notificationEmail: z.string().email().max(320).nullable(),
    alertEmailsEnabled: z.boolean(),
    digestTimezone: z.string().min(1).max(100)
  }),
  // Webhook secrets are intentionally never exported. If a destination exists
  // on the target machine, its safe preferences can still be restored.
  discord: z
    .object({
      enabled: z.boolean(),
      filters: listingFilterSchema.nullable().optional(),
      companySlugs: z.array(z.string().min(1).max(255)).max(10_000)
    })
    .nullable()
    .optional(),
  savedSearches: z.array(
    z.object({
      name: z.string().min(1).max(100),
      filterJson: z.unknown(),
      alertsEnabled: z.boolean(),
      alertCadence: z.enum(["IMMEDIATE", "DAILY"])
    })
  ).max(10_000),
  jobs: z.array(
    z.object({
      posting: postingReferenceSchema,
      favorite: z.boolean(),
      list: z.object({ isCompleted: z.boolean(), completedAt: z.string().datetime().nullable() }).nullable(),
      applicationState: applicationStateSchema.nullable()
    })
  ).max(100_000),
  companies: z.array(
    z.object({
      slug: z.string().min(1).max(255),
      name: z.string().min(1).max(255),
      websiteUrl: z.string().url().nullable(),
      careersUrl: z.string().url().nullable(),
      companyBucket: companyBucketSchema,
      tags: z.array(z.string().max(100)).max(100),
      notes: z.string().max(10_000).nullable(),
      isActive: z.boolean(),
      sources: z.array(
        z.object({
          sourceType: sourceTypeSchema,
          sourceName: z.string().min(1).max(255),
          sourceIdentifier: z.string().min(1).max(255),
          sourceUrl: httpUrlSchema,
          pollingEnabled: z.boolean(),
          priority: z.number().int().min(0).max(10_000),
          requestConfigJson: z.unknown().nullable(),
          parserConfigJson: z.unknown().nullable(),
          isActive: z.boolean()
        })
      ).max(1_000)
    })
  ).max(10_000)
});

export type PortableData = z.infer<typeof portableDataSchema>;

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function createPortableData(theme: "light" | "dark" | "system"): Promise<PortableData> {
  const user = await getLocalProfile();
  const [savedSearches, favorites, listItems, applicationStates, companies, discordDestination] = await Promise.all([
    prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.userFavorite.findMany({
      where: { userId: user.id },
      include: { internshipPosting: { include: { company: { select: { slug: true } } } } }
    }),
    prisma.userPostingListItem.findMany({
      where: { userId: user.id },
      include: { internshipPosting: { include: { company: { select: { slug: true } } } } }
    }),
    prisma.userApplicationState.findMany({
      where: { userId: user.id },
      include: { internshipPosting: { include: { company: { select: { slug: true } } } } }
    }),
    prisma.company.findMany({
      orderBy: { slug: "asc" },
      include: { sources: { orderBy: [{ priority: "asc" }, { sourceIdentifier: "asc" }] } }
    }),
    prisma.discordDestination.findUnique({
      where: { userId: user.id },
      select: {
        enabled: true,
        filterJson: true,
        companies: {
          select: {
            company: { select: { slug: true } }
          }
        }
      }
    })
  ]);

  type JobAccumulator = {
    posting: { slug: string; companySlug: string; externalJobId: string | null; applicationUrl: string };
    favorite: boolean;
    list: { isCompleted: boolean; completedAt: string | null } | null;
    applicationState: "APPLIED" | "HIDDEN" | null;
  };
  const jobs = new Map<string, JobAccumulator>();
  const ensureJob = (posting: (typeof favorites)[number]["internshipPosting"]) => {
    const existing = jobs.get(posting.slug);
    if (existing) return existing;
    const created: JobAccumulator = {
      posting: {
        slug: posting.slug,
        companySlug: posting.company.slug,
        externalJobId: posting.externalJobId,
        applicationUrl: posting.applicationUrl
      },
      favorite: false,
      list: null,
      applicationState: null
    };
    jobs.set(posting.slug, created);
    return created;
  };

  favorites.forEach((favorite) => { ensureJob(favorite.internshipPosting).favorite = true; });
  listItems.forEach((item) => {
    ensureJob(item.internshipPosting).list = {
      isCompleted: item.isCompleted,
      completedAt: item.completedAt?.toISOString() ?? null
    };
  });
  applicationStates.forEach((state) => {
    if (state.state !== "NONE") ensureJob(state.internshipPosting).applicationState = state.state;
  });

  return {
    format: PORTABLE_DATA_FORMAT,
    version: PORTABLE_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      theme,
      notificationEmail: isPlaceholderLocalEmail(user.email) ? null : user.email,
      alertEmailsEnabled: user.alertEmailsEnabled,
      digestTimezone: user.digestTimezone
    },
    discord: discordDestination
      ? {
          enabled: discordDestination.enabled,
          filters: discordDestination.filterJson == null ? null : listingFilterSchema.parse(discordDestination.filterJson),
          companySlugs: discordDestination.companies.map((entry) => entry.company.slug)
        }
      : null,
    savedSearches: savedSearches.map((search) => ({
      name: search.name,
      filterJson: search.filterJson,
      alertsEnabled: search.alertsEnabled,
      alertCadence: search.alertCadence
    })),
    jobs: Array.from(jobs.values()),
    companies: companies.map((company) => ({
      slug: company.slug,
      name: company.name,
      websiteUrl: company.websiteUrl,
      careersUrl: company.careersUrl,
      companyBucket: company.companyBucket,
      tags: company.tags,
      notes: company.notes,
      isActive: company.isActive,
      sources: company.sources.map((source) => ({
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        sourceIdentifier: source.sourceIdentifier,
        sourceUrl: source.sourceUrl,
        pollingEnabled: source.pollingEnabled,
        priority: source.priority,
        requestConfigJson: source.requestConfigJson,
        parserConfigJson: source.parserConfigJson,
        isActive: source.isActive
      }))
    }))
  };
}

export async function importPortableData(data: PortableData, replacePersonalData: boolean) {
  const user = await getLocalProfile();
  let restoredJobs = 0;
  let unresolvedJobs = 0;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: data.settings.notificationEmail ?? "local@swe-quant-tracker.invalid",
        alertEmailsEnabled: Boolean(data.settings.notificationEmail) && data.settings.alertEmailsEnabled,
        digestTimezone: data.settings.digestTimezone
      }
    });

    if (data.discord) {
      const destination = await tx.discordDestination.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });

      if (destination) {
        const matchingCompanies = await tx.company.findMany({
          where: {
            slug: { in: data.discord.companySlugs },
            isActive: true,
            sources: {
              some: {
                isActive: true,
                pollingEnabled: true
              }
            }
          },
          select: { id: true }
        });

        await tx.discordDestination.update({
          where: { id: destination.id },
          data: {
            enabled: data.discord.enabled,
            filterJson: data.discord.filters ?? Prisma.DbNull,
            companies: {
              deleteMany: {},
              create: matchingCompanies.map((company) => ({ companyId: company.id }))
            }
          }
        });
      }
    }

    if (replacePersonalData) {
      await tx.alertDelivery.deleteMany({ where: { userId: user.id } });
      await tx.savedSearch.deleteMany({ where: { userId: user.id } });
      await tx.userFavorite.deleteMany({ where: { userId: user.id } });
      await tx.userPostingListItem.deleteMany({ where: { userId: user.id } });
      await tx.userApplicationState.deleteMany({ where: { userId: user.id } });
    }

    for (const search of data.savedSearches) {
      await tx.savedSearch.upsert({
        where: { userId_name: { userId: user.id, name: search.name } },
        update: {
          filterJson: asInputJson(search.filterJson),
          alertsEnabled: search.alertsEnabled,
          alertCadence: search.alertCadence
        },
        create: {
          userId: user.id,
          name: search.name,
          filterJson: asInputJson(search.filterJson),
          alertsEnabled: search.alertsEnabled,
          alertCadence: search.alertCadence
        }
      });
    }

    for (const company of data.companies) {
      const companyRecord = await tx.company.upsert({
        where: { slug: company.slug },
        update: {
          name: company.name,
          websiteUrl: company.websiteUrl,
          careersUrl: company.careersUrl,
          companyBucket: company.companyBucket,
          tags: company.tags,
          notes: company.notes,
          isActive: company.isActive
        },
        create: {
          name: company.name,
          slug: company.slug,
          websiteUrl: company.websiteUrl,
          careersUrl: company.careersUrl,
          companyBucket: company.companyBucket,
          tags: company.tags,
          notes: company.notes,
          isActive: company.isActive
        }
      });

      for (const source of company.sources) {
        const optionalJson = (value: unknown | null) => value === null ? undefined : asInputJson(value);
        await tx.companySource.upsert({
          where: {
            companyId_sourceType_sourceIdentifier: {
              companyId: companyRecord.id,
              sourceType: source.sourceType,
              sourceIdentifier: source.sourceIdentifier
            }
          },
          update: {
            sourceName: source.sourceName,
            sourceUrl: source.sourceUrl,
            pollingEnabled: source.pollingEnabled,
            priority: source.priority,
            requestConfigJson: optionalJson(source.requestConfigJson),
            parserConfigJson: optionalJson(source.parserConfigJson),
            isActive: source.isActive
          },
          create: {
            companyId: companyRecord.id,
            sourceType: source.sourceType,
            sourceName: source.sourceName,
            sourceIdentifier: source.sourceIdentifier,
            sourceUrl: source.sourceUrl,
            pollingEnabled: source.pollingEnabled,
            priority: source.priority,
            requestConfigJson: optionalJson(source.requestConfigJson),
            parserConfigJson: optionalJson(source.parserConfigJson),
            isActive: source.isActive
          }
        });
      }
    }

    for (const job of data.jobs) {
      const posting = await tx.internshipPosting.findFirst({
        where: {
          company: { slug: job.posting.companySlug },
          OR: [
            { slug: job.posting.slug },
            ...(job.posting.externalJobId ? [{ externalJobId: job.posting.externalJobId }] : []),
            { applicationUrl: job.posting.applicationUrl }
          ]
        },
        select: { id: true }
      });

      if (!posting) {
        unresolvedJobs += 1;
        continue;
      }

      if (job.favorite) {
        await tx.userFavorite.upsert({
          where: { userId_internshipPostingId: { userId: user.id, internshipPostingId: posting.id } },
          update: {},
          create: { userId: user.id, internshipPostingId: posting.id }
        });
      }
      if (job.list) {
        await tx.userPostingListItem.upsert({
          where: { userId_internshipPostingId: { userId: user.id, internshipPostingId: posting.id } },
          update: {
            isCompleted: job.list.isCompleted,
            completedAt: job.list.completedAt ? new Date(job.list.completedAt) : null
          },
          create: {
            userId: user.id,
            internshipPostingId: posting.id,
            isCompleted: job.list.isCompleted,
            completedAt: job.list.completedAt ? new Date(job.list.completedAt) : null
          }
        });
      }
      if (job.applicationState) {
        await tx.userApplicationState.upsert({
          where: { userId_internshipPostingId: { userId: user.id, internshipPostingId: posting.id } },
          update: { state: job.applicationState },
          create: { userId: user.id, internshipPostingId: posting.id, state: job.applicationState }
        });
      }
      restoredJobs += 1;
    }
  });

  return {
    savedSearches: data.savedSearches.length,
    companies: data.companies.length,
    restoredJobs,
    unresolvedJobs,
    theme: data.settings.theme
  };
}
