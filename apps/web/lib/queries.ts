import { subDays } from "date-fns";
import { unstable_cache } from "next/cache";
import { ensureIngestionSchedule, prisma, type ApplicationState, type Prisma } from "@swe-quant/db";
import {
  getPreferredPostingUrl,
  listingFilterSchema,
  matchesListingFilters,
  serializeRowsToCsv,
  type ListingFilters,
  type ListingSearchRecord
} from "@swe-quant/shared";

export { parseListingFilters } from "./listing-filter-params";

const listingSelect = {
  id: true,
  slug: true,
  companyNameSnapshot: true,
  title: true,
  roleCategory: true,
  season: true,
  year: true,
  locationRaw: true,
  locationsNormalized: true,
  locationCountries: true,
  remoteType: true,
  compensationMin: true,
  compensationMax: true,
  compensationCurrency: true,
  compensationInterval: true,
  postingDate: true,
  discoveredAt: true,
  applicationUrl: true,
  sourceUrl: true,
  sourceName: true,
  isActive: true,
  internshipFlag: true,
  newGradFlag: true,
  company: {
    select: {
      slug: true,
      companyBucket: true
    }
  }
} satisfies Prisma.InternshipPostingSelect;

type ListingRow = Prisma.InternshipPostingGetPayload<{
  select: typeof listingSelect;
}>;

export type FeedListing = {
  id: string;
  slug: string;
  companyNameSnapshot: string;
  title: string;
  roleCategory: ListingRow["roleCategory"];
  internshipFlag: boolean;
  newGradFlag: boolean;
  season: string | null;
  year: number | null;
  locationRaw: string | null;
  remoteType: ListingRow["remoteType"];
  compensationMin: string | null;
  compensationMax: string | null;
  compensationCurrency: string | null;
  compensationInterval: ListingRow["compensationInterval"];
  postingDate: string | null;
  discoveredAt: string;
  applicationUrl: string;
  sourceUrl: string | null;
  sourceName: string;
  company: {
    slug: string;
    companyBucket: ListingRow["company"]["companyBucket"];
  };
};

export type PostingListItem = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  isCompleted: boolean;
  posting: FeedListing;
};

function toListingRecord(
  posting: ListingRow
): ListingSearchRecord {
  return {
    companySlug: posting.company.slug,
    companyNameSnapshot: posting.companyNameSnapshot,
    companyBucket: posting.company.companyBucket,
    title: posting.title,
    roleCategory: posting.roleCategory,
    internshipFlag: posting.internshipFlag,
    newGradFlag: posting.newGradFlag,
    season: posting.season,
    year: posting.year,
    locationRaw: posting.locationRaw,
    locationCountries: posting.locationCountries,
    locationsNormalized: Array.isArray(posting.locationsNormalized)
      ? (posting.locationsNormalized as ListingSearchRecord["locationsNormalized"])
      : undefined,
    remoteType: posting.remoteType,
    compensationMin:
      typeof posting.compensationMin?.toNumber === "function"
        ? posting.compensationMin.toNumber()
        : undefined,
    compensationMax:
      typeof posting.compensationMax?.toNumber === "function"
        ? posting.compensationMax.toNumber()
        : undefined,
    isActive: posting.isActive,
    postingDate: posting.postingDate,
    discoveredAt: posting.discoveredAt
  };
}

function sortListings(
  listings: ListingRow[],
  sort: ListingFilters["sort"]
) {
  const sorted = [...listings];

  sorted.sort((left, right) => {
    let comparison = 0;
    switch (sort) {
      case "postingDate":
      case "newest":
        comparison = (right.postingDate?.getTime() ?? -Infinity) - (left.postingDate?.getTime() ?? -Infinity) ||
          right.discoveredAt.getTime() - left.discoveredAt.getTime();
        break;
      case "discoveredDate":
        comparison = (right.discoveredAt?.getTime() ?? 0) - (left.discoveredAt?.getTime() ?? 0);
        break;
      case "company":
        comparison = left.companyNameSnapshot.localeCompare(right.companyNameSnapshot);
        break;
      case "pay":
        comparison = (
          Number(right.compensationMax?.toString?.() ?? right.compensationMin?.toString?.() ?? 0) -
          Number(left.compensationMax?.toString?.() ?? left.compensationMin?.toString?.() ?? 0)
        );
        break;
      case "location":
        comparison = (left.locationRaw ?? "").localeCompare(right.locationRaw ?? "");
        break;
      default:
        break;
    }
    return comparison || left.id.localeCompare(right.id);
  });

  return sorted;
}

function locationDisplay(raw: string | null, normalized: Prisma.JsonValue): string | null {
  const normalizedDisplay = Array.isArray(normalized)
    ? normalized.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const display = typeof value.display === "string" ? value.display : value.raw;
    return typeof display === "string" && display.trim() ? [display] : [];
    }).join(" | ") || null
    : null;

  return normalizedDisplay ?? (raw?.trim() || null);
}

export function serializeFeedListing(listing: ListingRow): FeedListing {
  return {
    id: listing.id,
    slug: listing.slug,
    companyNameSnapshot: listing.companyNameSnapshot,
    title: listing.title,
    roleCategory: listing.roleCategory,
    internshipFlag: listing.internshipFlag,
    newGradFlag: listing.newGradFlag,
    season: listing.season,
    year: listing.year,
    locationRaw: locationDisplay(listing.locationRaw, listing.locationsNormalized),
    remoteType: listing.remoteType,
    compensationMin: listing.compensationMin?.toString() ?? null,
    compensationMax: listing.compensationMax?.toString() ?? null,
    compensationCurrency: listing.compensationCurrency,
    compensationInterval: listing.compensationInterval,
    postingDate: listing.postingDate?.toISOString() ?? null,
    discoveredAt: listing.discoveredAt.toISOString(),
    applicationUrl: listing.applicationUrl,
    sourceUrl: listing.sourceUrl,
    sourceName: listing.sourceName,
    company: {
      slug: listing.company.slug,
      companyBucket: listing.company.companyBucket
    }
  };
}

type ListingPageOptions = {
  offset: number;
  limit: number;
};

function buildListingsWhere(filters: ListingFilters, userId?: string): Prisma.InternshipPostingWhereInput {
  // These predicates are deliberately shared by the paginated and fallback
  // paths so their totals and row membership cannot drift apart.
  const payKnownWhere: Prisma.InternshipPostingWhereInput =
    filters.payKnown === "known" || !filters.includeMissingPay
      ? {
          OR: [{ compensationMin: { not: null } }, { compensationMax: { not: null } }]
        }
      : filters.payKnown === "unknown"
        ? { compensationMin: null, compensationMax: null }
        : {};
  const minimumPayWhere: Prisma.InternshipPostingWhereInput =
    typeof filters.minimumPay === "number"
      ? {
          OR: [
            { compensationMax: { gte: filters.minimumPay } },
            { compensationMax: null, compensationMin: { gte: filters.minimumPay } }
          ]
        }
      : {};
  const queryPredicates: Prisma.InternshipPostingWhereInput[] = [
    // Free text, country inference, and location phrases are evaluated by
    // matchesListingFilters. Avoid a SQL contains prefilter here because it
    // can exclude canonical matches (punctuation and accents) before the
    // shared matcher sees them.
    payKnownWhere,
    ...(filters.payKnown === "unknown" ? [{ compensationMin: null, compensationMax: null }] : []),
    minimumPayWhere
  ];

  const positionTypes = filters.positionTypes ?? [];
  const positionWhere: Prisma.InternshipPostingWhereInput =
    positionTypes.length === 1
      ? positionTypes[0] === "INTERNSHIP"
        ? { internshipFlag: true }
        : { newGradFlag: true }
      : { OR: [{ internshipFlag: true }, { newGradFlag: true }] };

  return {
    ...positionWhere,
    AND: queryPredicates,
    ...(filters.companySlugs.length || filters.companyBuckets.length
      ? {
          company: {
            ...(filters.companySlugs.length ? { slug: { in: filters.companySlugs } } : {}),
            ...(filters.companyBuckets.length ? { companyBucket: { in: filters.companyBuckets } } : {})
          }
        }
      : {}),
    ...(filters.roleCategories.length ? { roleCategory: { in: filters.roleCategories } } : {}),
    ...(filters.seasons.length ? { season: { in: filters.seasons } } : {}),
    ...(filters.years.length ? { year: { in: filters.years } } : {}),
    ...(filters.remoteTypes.length ? { remoteType: { in: filters.remoteTypes } } : {}),
    ...(filters.activeOnly ? { isActive: true } : {}),
    ...(userId
      ? {
          applicationStates: {
            none: {
              userId,
              state: "HIDDEN"
            }
          }
        }
      : {}),
    ...(filters.recentlyPostedDays
      ? {
          postingDate: {
            gte: subDays(new Date(), filters.recentlyPostedDays)
          }
        }
      : {})
  };
}

/**
 * Free-text query and location filters use the shared canonicalized matcher,
 * which cannot be represented exactly by Prisma. Keep those cases on the
 * existing full-materialization path. Scalar filters with a matching database
 * sort can be counted and paged in Postgres without changing row semantics.
 */
function canUsePaginatedListings(filters: ListingFilters): boolean {
  return (
    !filters.q &&
    filters.locations.length === 0 &&
    filters.countries.length === 0 &&
    filters.positionTypes.length === 0 &&
    !filters.usOnly &&
    !filters.recentlyPostedDays &&
    filters.includeMissingLocation &&
    (filters.sort === "postingDate" ||
      filters.sort === "newest" ||
      filters.sort === "discoveredDate")
  );
}

const getCachedListingFilterMetadata = unstable_cache(
  async () => {
    return prisma.company.findMany({
      where: {
        isActive: true,
        postings: {
          some: {
            OR: [{ internshipFlag: true }, { newGradFlag: true }]
          }
        }
      },
      orderBy: {
        name: "asc"
      },
      select: {
        slug: true,
        name: true,
        _count: {
          select: {
            postings: {
              where: {
                OR: [{ internshipFlag: true }, { newGradFlag: true }]
              }
            }
          }
        }
      }
    });
  },
  ["listing-filter-metadata"],
  { revalidate: 30 }
);

export async function getListings(filters: ListingFilters, userId?: string) {
  // Keep the final shared matcher below for consistent semantics, but push
  // cheap predicates into Postgres so page navigations and feed batches do not
  // materialize every posting before filtering in Node.
  const broadWhere = buildListingsWhere(filters, userId);

  const listings = await prisma.internshipPosting.findMany({
    where: broadWhere,
    select: listingSelect,
    orderBy:
      filters.sort === "postingDate" || filters.sort === "newest"
        ? [{ postingDate: "desc" }, { discoveredAt: "desc" }]
        : {
            discoveredAt: "desc"
          },
  });

  const filtered = listings.filter((posting) =>
    matchesListingFilters(toListingRecord(posting), filters)
  );

  return sortListings(filtered, filters.sort);
}

export async function getListingsPage(
  filters: ListingFilters,
  userId: string | undefined,
  { offset, limit }: ListingPageOptions
) {
  if (!canUsePaginatedListings(filters)) {
    const listings = await getListings(filters, userId);

    return {
      listings: listings.slice(offset, offset + limit),
      total: listings.length
    };
  }

  const where = buildListingsWhere(filters, userId);
  const orderBy =
    filters.sort === "discoveredDate"
      ? [{ discoveredAt: "desc" as const }, { id: "asc" as const }]
      : [
          { postingDate: { sort: "desc" as const, nulls: "last" as const } },
          { discoveredAt: "desc" as const },
          { id: "asc" as const }
        ];
  const [total, listings] = await Promise.all([
    prisma.internshipPosting.count({ where }),
    prisma.internshipPosting.findMany({
      where,
      select: listingSelect,
      orderBy,
      skip: offset,
      take: limit
    })
  ]);

  return { listings, total };
}

export async function getListingFilterMetadata() {
  return getCachedListingFilterMetadata();
}

export async function getHomeStats() {
  const [activeInternships, newInternships, companyCount, activeSourceCount] = await Promise.all([
    prisma.internshipPosting.count({
      where: { OR: [{ internshipFlag: true }, { newGradFlag: true }], isActive: true }
    }),
    prisma.internshipPosting.count({
      where: {
        OR: [{ internshipFlag: true }, { newGradFlag: true }],
        discoveredAt: {
          gte: subDays(new Date(), 7)
        }
      }
    }),
    prisma.company.count({
      where: { isActive: true }
    }),
    prisma.companySource.count({
      where: { isActive: true, pollingEnabled: true }
    })
  ]);

  return {
    activeInternships,
    newInternships,
    companyCount,
    activeSourceCount
  };
}

export async function getCompaniesOverview() {
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      sources: {
        some: {
          isActive: true,
          pollingEnabled: true
        }
      }
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      websiteUrl: true,
      careersUrl: true,
      companyBucket: true,
      tags: true,
      sources: {
        where: {
          isActive: true,
          pollingEnabled: true
        },
        orderBy: [{ priority: "asc" }, { sourceType: "asc" }],
        select: {
          id: true,
          sourceType: true,
          sourceName: true,
          sourceIdentifier: true,
          sourceUrl: true
        }
      }
    }
  });

  if (companies.length === 0) {
    return [];
  }

  const postingCounts = await prisma.internshipPosting.groupBy({
    by: ["companyId"],
    where: {
      companyId: {
        in: companies.map((company) => company.id)
      },
      OR: [{ internshipFlag: true }, { newGradFlag: true }],
      isActive: true,
    },
    _count: {
      _all: true
    }
  });

  const postingCountByCompanyId = new Map(
    postingCounts.map((entry) => [entry.companyId, entry._count._all])
  );

  return companies.map((company) => ({
    ...company,
    trackedSourceCount: company.sources.length,
    activeInternshipCount: postingCountByCompanyId.get(company.id) ?? 0
  }));
}

export async function getInternshipBySlug(slug: string, userId?: string) {
  const posting = await prisma.internshipPosting.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      companyNameSnapshot: true,
      title: true,
      roleCategory: true,
      internshipFlag: true,
      newGradFlag: true,
      season: true,
      year: true,
      locationRaw: true,
      locationsNormalized: true,
      locationCountries: true,
      remoteType: true,
      payRaw: true,
      postingDate: true,
      discoveredAt: true,
      applicationUrl: true,
      sourceUrl: true,
      sourceName: true,
      isActive: true,
      descriptionText: true,
      company: {
        select: {
          slug: true,
          name: true,
          companyBucket: true,
          websiteUrl: true,
          careersUrl: true
        }
      },
      sourceRecords: {
        orderBy: { lastSeenAt: "desc" },
        select: {
          id: true,
          sourceUrl: true,
          applicationUrl: true,
          lastSeenAt: true,
          companySource: {
            select: {
              sourceName: true,
              sourceType: true
            }
          }
        }
      }
    }
  });

  if (!posting) {
    return null;
  }

  const [favorite, applicationState] = userId
    ? await Promise.all([
        prisma.userFavorite.findFirst({
          where: {
            userId,
            internshipPostingId: posting.id
          }
        }),
        prisma.userApplicationState.findFirst({
          where: {
            userId,
            internshipPostingId: posting.id
          }
        })
      ])
    : [null, null];

  return {
    posting: { ...posting, locationRaw: locationDisplay(posting.locationRaw, posting.locationsNormalized) },
    favorite,
    applicationState
  };
}

export async function getUserSavedSearches(userId: string) {
  return prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Return the local profile's Discord destination without ever serializing the
 * webhook secret into the page. The company IDs are intentionally scoped to
 * this destination so changing one profile cannot affect another database
 * user if authentication is added later.
 */
export async function getDiscordSettings(userId: string) {
  const [destination, companies] = await Promise.all([
    prisma.discordDestination.findUnique({
      where: { userId },
      select: {
        id: true,
        enabled: true,
        name: true,
        filterJson: true,
        lastTestedAt: true,
        lastTestStatus: true,
        lastError: true,
        companies: {
          select: { companyId: true, company: { select: { slug: true } } }
        }
      }
    }),
    prisma.company.findMany({
      where: {
        isActive: true,
        sources: {
          some: {
            isActive: true,
            pollingEnabled: true
          }
        }
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        companyBucket: true,
        _count: { select: { postings: true } }
      }
    })
  ]);

  return {
    destination: destination
      ? {
          id: destination.id,
          enabled: destination.enabled && (destination.filterJson != null || destination.companies.length > 0),
          name: destination.name,
          filters: listingFilterSchema.parse(destination.filterJson ?? {
            companySlugs: destination.companies.map((entry) => entry.company.slug),
            activeOnly: false,
            usOnly: false
          }),
          lastTestedAt: destination.lastTestedAt,
          lastTestStatus: destination.lastTestStatus,
          lastError: destination.lastError,
          selectedCompanyIds: destination.companies.map((entry) => entry.companyId)
        }
      : null,
    companies
  };
}

export async function getUserFavorites(userId: string) {
  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    include: {
      internshipPosting: {
        include: {
          company: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return favorites.map((favorite) => ({
    ...favorite,
    internshipPosting: {
      ...favorite.internshipPosting,
      locationRaw: locationDisplay(
        favorite.internshipPosting.locationRaw,
        favorite.internshipPosting.locationsNormalized
      )
    }
  }));
}

export async function getFavoritePostingIds(userId: string, postingIds: string[]) {
  const favorites = await prisma.userFavorite.findMany({
    where: {
      userId,
      internshipPostingId: { in: postingIds }
    },
    select: {
      internshipPostingId: true
    }
  });

  return new Set(favorites.map((favorite) => favorite.internshipPostingId));
}

export async function getPostingListIds(userId: string, postingIds: string[]) {
  const listItems = await prisma.userPostingListItem.findMany({
    where: {
      userId,
      internshipPostingId: { in: postingIds }
    },
    select: {
      internshipPostingId: true
    }
  });

  return new Set(listItems.map((item) => item.internshipPostingId));
}

export async function getUserPostingList(userId: string): Promise<PostingListItem[]> {
  const items = await prisma.userPostingListItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      completedAt: true,
      isCompleted: true,
      internshipPosting: {
        select: listingSelect
      }
    }
  });

  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    completedAt: item.completedAt?.toISOString() ?? null,
    isCompleted: item.isCompleted,
    posting: serializeFeedListing(item.internshipPosting)
  }));
}

export async function getApplicationStateMap(userId: string, postingIds: string[]) {
  const states = await prisma.userApplicationState.findMany({
    where: {
      userId,
      internshipPostingId: { in: postingIds }
    }
  });

  return new Map<string, ApplicationState>(
    states.map((state) => [state.internshipPostingId, state.state])
  );
}

export async function getAdminDashboardData() {
  const [runs, newPostings, companies, sources, searches, recentPostings, alertSearches, alertPreviewPostings, ingestionSchedule] = await Promise.all([
    prisma.ingestionRun.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
      include: {
        companySource: {
          include: {
            company: true
          }
        }
      }
    }),
    prisma.internshipPosting.findMany({
      where: {
        OR: [{ internshipFlag: true }, { newGradFlag: true }],
        discoveredAt: {
          gte: subDays(new Date(), 7)
        }
      },
      take: 20,
      orderBy: { discoveredAt: "desc" },
      include: { company: true }
    }),
    prisma.company.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            sources: true,
            postings: true
          }
        }
      }
    }),
    prisma.companySource.findMany({
      take: 30,
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      include: {
        company: true
      }
    }),
    prisma.savedSearch.count({
      where: { alertsEnabled: true }
    }),
    prisma.internshipPosting.findMany({
      where: {
        OR: [{ internshipFlag: true }, { newGradFlag: true }]
      },
      take: 150,
      orderBy: { discoveredAt: "desc" }
    }),
    prisma.savedSearch.findMany({
      where: {
        alertsEnabled: true,
        user: {
          alertEmailsEnabled: true
        }
      },
      include: {
        user: true
      }
    }),
    prisma.internshipPosting.findMany({
      where: {
        OR: [{ internshipFlag: true }, { newGradFlag: true }],
        discoveredAt: {
          gte: subDays(new Date(), 1)
        }
      },
      include: {
        company: true
      }
    }),
    ensureIngestionSchedule()
  ]);

  const duplicateMap = new Map<string, typeof recentPostings>();

  for (const posting of recentPostings) {
    const bucket = duplicateMap.get(posting.dedupeFingerprint) ?? [];
    bucket.push(posting);
    duplicateMap.set(posting.dedupeFingerprint, bucket);
  }

  const potentialDuplicates = Array.from(duplicateMap.values())
    .filter((bucket) => bucket.length > 1)
    .slice(0, 10);
  const alertPreviewCount = alertSearches.reduce((count, search) => {
    const parsed = listingFilterSchema.safeParse(search.filterJson);

    if (!parsed.success) {
      return count;
    }

    return (
      count +
      alertPreviewPostings.filter((posting) =>
        matchesListingFilters(toListingRecord(posting), parsed.data)
      ).length
    );
  }, 0);

  return {
    runs,
    newPostings,
    companies,
    sources,
    ingestionSchedule,
    searches,
    potentialDuplicates,
    alertPreviewCount
  };
}

export async function exportListingsCsv(filters: ListingFilters, userId?: string) {
  const listings = await getListings(filters, userId);

  return serializeRowsToCsv(
    listings.map((listing) => ({
      company: listing.companyNameSnapshot,
      title: listing.title,
      season: listing.season ?? "",
      year: listing.year ?? "",
      location: locationDisplay(listing.locationRaw, listing.locationsNormalized) ?? "",
      remoteType: listing.remoteType,
      postingDate: listing.postingDate?.toISOString() ?? "",
      discoveredAt: listing.discoveredAt?.toISOString() ?? "",
      payMin:
        typeof listing.compensationMin?.toString === "function"
          ? listing.compensationMin.toString()
          : "",
      payMax:
        typeof listing.compensationMax?.toString === "function"
          ? listing.compensationMax.toString()
          : "",
      applicationUrl: getPreferredPostingUrl(listing) ?? listing.applicationUrl
    }))
  );
}
