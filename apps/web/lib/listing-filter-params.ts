import { listingFilterSchema, type ListingFilters } from "@swe-quant/shared";

type SearchParams = Record<string, string | string[] | undefined>;

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
  const first = Array.isArray(value) ? value.at(-1) : value;

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
    years: readArrayParam(searchParams.year)
      .map(Number)
      .filter(Number.isInteger),
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

export function parseListingFilterForm(formData: FormData): ListingFilters {
  const params: SearchParams = {};
  for (const key of new Set(formData.keys())) {
    params[key] = formData.getAll(key).map(String);
  }
  return parseListingFilters(params);
}
