import { prisma, type Prisma } from "@faang-quant/db";

export const COMPANIES_PAGE_SIZE = 24;

const companiesWhere = {
  isActive: true,
  sources: {
    some: {
      isActive: true,
      pollingEnabled: true
    }
  }
} satisfies Prisma.CompanyWhereInput;

const trackedLocationWhere = {
  OR: [
    { locationCountries: { isEmpty: true } },
    { locationCountries: { has: "US" } }
  ]
} satisfies Prisma.InternshipPostingWhereInput;

const companySelect = {
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
} satisfies Prisma.CompanySelect;

type CompanyRow = Prisma.CompanyGetPayload<{ select: typeof companySelect }>;

export type CompanyOverview = CompanyRow & {
  trackedSourceCount: number;
  activeInternshipCount: number;
};

export type CompaniesPage = {
  companies: CompanyOverview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Parse a URL page value without allowing zero, negatives, decimals, or huge offsets. */
export function parseCompaniesPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) {
    return 1;
  }

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function getCompaniesOverviewPage(
  requestedPage: number,
  pageSize = COMPANIES_PAGE_SIZE
): Promise<CompaniesPage> {
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : COMPANIES_PAGE_SIZE;
  const safeRequestedPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const total = await prisma.company.count({ where: companiesWhere });
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const page = Math.min(safeRequestedPage, totalPages);
  const skip = (page - 1) * safePageSize;

  const companies = await prisma.company.findMany({
    where: companiesWhere,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip,
    take: safePageSize,
    select: companySelect
  });

  if (companies.length === 0) {
    return { companies: [], total, page, pageSize: safePageSize, totalPages };
  }

  const postingCounts = await prisma.internshipPosting.groupBy({
    by: ["companyId"],
    where: {
      companyId: { in: companies.map((company) => company.id) },
      internshipFlag: true,
      isActive: true,
      ...trackedLocationWhere
    },
    _count: { _all: true }
  });
  const postingCountByCompanyId = new Map(
    postingCounts.map((entry) => [entry.companyId, entry._count._all])
  );

  return {
    companies: companies.map((company) => ({
      ...company,
      trackedSourceCount: company.sources.length,
      activeInternshipCount: postingCountByCompanyId.get(company.id) ?? 0
    })),
    total,
    page,
    pageSize: safePageSize,
    totalPages
  };
}
