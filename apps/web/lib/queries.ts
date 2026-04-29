import { subDays } from "date-fns";
import { prisma, type Prisma } from "@faang-quant/db";
import {
  getPreferredPostingUrl,
  isUsOrUnknownPostingLocation,
  listingFilterSchema,
  matchesListingFilters,
  serializeRowsToCsv,
  type ListingFilters,
  type ListingSearchRecord
} from "@faang-quant/shared";

type SearchParams = Record<string, string | string[] | undefined>;
type ListingRow = Prisma.InternshipPostingGetPayload<{
  include: {
    company: true;
  };
}>;

function readArrayParam(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readBooleanParam(value: string | string[] | undefined, defaultValue: boolean): boolean {
  const first = Array.isArray(value) ? value[0] : value;

  if (first === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(first.toLowerCase());
}

function readNumberParam(value: string | string[] | undefined): number | undefined {
  const first = Array.isArray(value) ? value[0] : value;

  if (!first) {
    return undefined;
  }

  const parsed = Number(first);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSortParam(
  value: string | string[] | undefined
): ListingFilters["sort"] | undefined {
  const first = Array.isArray(value) ? value[0] : value;

  if (!first) {
    return undefined;
  }

  if (first === "newest") {
    return "postingDate";
  }

  return first as ListingFilters["sort"];
}

export function parseListingFilters(searchParams: SearchParams): ListingFilters {
  return listingFilterSchema.parse({
    q: Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q,
    companySlugs: readArrayParam(searchParams.company),
    companyBuckets: readArrayParam(searchParams.bucket),
    roleCategories: readArrayParam(searchParams.category),
    seasons: readArrayParam(searchParams.season),
    years: readArrayParam(searchParams.year).map(Number),
    locations: readArrayParam(searchParams.location),
    remoteTypes: readArrayParam(searchParams.remote),
    payKnown: (Array.isArray(searchParams.payKnown) ? searchParams.payKnown[0] : searchParams.payKnown) ?? "all",
    minimumPay: readNumberParam(searchParams.minimumPay),
    activeOnly: readBooleanParam(searchParams.activeOnly, true),
    recentlyPostedDays: readNumberParam(searchParams.recent),
    usOnly: readBooleanParam(searchParams.usOnly, true),
    includeMissingLocation: readBooleanParam(searchParams.includeMissingLocation, true),
    includeMissingPay: readBooleanParam(searchParams.includeMissingPay, true),
    sort: normalizeSortParam(searchParams.sort) ?? "postingDate"
  });
}

const trackedLocationWhere: Prisma.InternshipPostingWhereInput = {
  OR: [
    { locationCountries: { isEmpty: true } },
    { locationCountries: { equals: ["US"] } }
  ]
};

function toListingRecord(
  posting: Prisma.InternshipPostingGetPayload<{
    include: { company: true };
  }>
): ListingSearchRecord {
  return {
    companySlug: posting.company.slug,
    companyNameSnapshot: posting.companyNameSnapshot,
    companyBucket: posting.company.companyBucket,
    title: posting.title,
    roleCategory: posting.roleCategory,
    season: posting.season,
    year: posting.year,
    locationRaw: posting.locationRaw,
    locationCountries: posting.locationCountries,
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
    switch (sort) {
      case "postingDate":
      case "newest":
        return (right.postingDate?.getTime() ?? 0) - (left.postingDate?.getTime() ?? 0);
      case "discoveredDate":
        return (right.discoveredAt?.getTime() ?? 0) - (left.discoveredAt?.getTime() ?? 0);
      case "company":
        return left.companyNameSnapshot.localeCompare(right.companyNameSnapshot);
      case "pay":
        return (
          Number(right.compensationMax?.toString?.() ?? right.compensationMin?.toString?.() ?? 0) -
          Number(left.compensationMax?.toString?.() ?? left.compensationMin?.toString?.() ?? 0)
        );
      case "location":
        return (left.locationRaw ?? "").localeCompare(right.locationRaw ?? "");
      default:
        return 0;
    }
  });

  return sorted;
}

export async function getListings(filters: ListingFilters) {
  const broadWhere: Prisma.InternshipPostingWhereInput = {
    internshipFlag: true,
    AND: [
      trackedLocationWhere,
      ...(filters.q
        ? [
            {
              OR: [
                { title: { contains: filters.q, mode: "insensitive" as const } },
                { companyNameSnapshot: { contains: filters.q, mode: "insensitive" as const } },
                { locationRaw: { contains: filters.q, mode: "insensitive" as const } }
              ]
            }
          ]
        : [])
    ],
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
    ...(filters.recentlyPostedDays
      ? {
          postingDate: {
            gte: subDays(new Date(), filters.recentlyPostedDays)
          }
        }
      : {})
  };

  const listings = await prisma.internshipPosting.findMany({
    where: broadWhere,
    include: {
      company: true
    },
    orderBy:
      filters.sort === "postingDate" || filters.sort === "newest"
        ? [{ postingDate: "desc" }, { discoveredAt: "desc" }]
        : {
            discoveredAt: "desc"
          },
    take: 500
  });

  const filtered = listings.filter((posting) =>
    matchesListingFilters(toListingRecord(posting), filters)
  );

  return sortListings(filtered, filters.sort);
}

export async function getListingFilterMetadata() {
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      postings: {
        some: {
          internshipFlag: true,
          ...trackedLocationWhere
        }
      }
    },
    orderBy: {
      name: "asc"
    },
    include: {
      _count: {
        select: {
          postings: {
            where: {
              internshipFlag: true,
              ...trackedLocationWhere
            }
          }
        }
      }
    }
  });

  return companies;
}

export async function getHomeStats() {
  const [activeInternships, newInternships, companyCount, activeSourceCount] = await Promise.all([
    prisma.internshipPosting.count({
      where: { internshipFlag: true, isActive: true, ...trackedLocationWhere }
    }),
    prisma.internshipPosting.count({
      where: {
        internshipFlag: true,
        ...trackedLocationWhere,
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
      internshipFlag: true,
      isActive: true,
      ...trackedLocationWhere
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
    include: {
      company: true,
      sourceRecords: {
        include: {
          companySource: true
        }
      }
    }
  });

  if (!posting || !isUsOrUnknownPostingLocation(posting.locationCountries, posting.locationRaw)) {
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
    posting,
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

export async function getUserFavorites(userId: string) {
  return prisma.userFavorite.findMany({
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

export async function getApplicationStateMap(userId: string, postingIds: string[]) {
  const states = await prisma.userApplicationState.findMany({
    where: {
      userId,
      internshipPostingId: { in: postingIds }
    }
  });

  return new Map(states.map((state) => [state.internshipPostingId, state.state]));
}

export async function getAdminDashboardData() {
  const [runs, newPostings, companies, sources, searches, recentPostings, alertSearches, alertPreviewPostings] = await Promise.all([
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
        internshipFlag: true,
        ...trackedLocationWhere,
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
        internshipFlag: true,
        ...trackedLocationWhere
      },
      take: 150,
      orderBy: { discoveredAt: "desc" }
    }),
    prisma.savedSearch.findMany({
      where: {
        alertsEnabled: true,
        user: {
          alertEmailsEnabled: true,
          emailVerified: { not: null }
        }
      },
      include: {
        user: true
      }
    }),
    prisma.internshipPosting.findMany({
      where: {
        internshipFlag: true,
        ...trackedLocationWhere,
        discoveredAt: {
          gte: subDays(new Date(), 1)
        }
      },
      include: {
        company: true
      }
    })
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
    searches,
    potentialDuplicates,
    alertPreviewCount
  };
}

export async function exportListingsCsv(filters: ListingFilters) {
  const listings = await getListings(filters);

  return serializeRowsToCsv(
    listings.map((listing) => ({
      company: listing.companyNameSnapshot,
      title: listing.title,
      season: listing.season ?? "",
      year: listing.year ?? "",
      location: listing.locationRaw ?? "",
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
