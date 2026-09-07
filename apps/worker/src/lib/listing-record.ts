import type { ListingSearchRecord, NormalizedLocation } from "@swe-quant/shared";

export function toListingSearchRecord(posting: {
  company: { slug: string; companyBucket: string };
  companyNameSnapshot: string;
  title: string;
  roleCategory: string;
  season: string | null;
  year: number | null;
  locationRaw: string | null;
  locationsNormalized: unknown;
  locationCountries: string[];
  internshipFlag: boolean;
  newGradFlag: boolean;
  remoteType: string;
  compensationMin: unknown;
  compensationMax: unknown;
  isActive: boolean;
  postingDate: Date | null;
  discoveredAt: Date;
}): ListingSearchRecord & {
  locationsNormalized: NormalizedLocation[];
  internshipFlag: boolean;
  newGradFlag: boolean;
} {
  const toNumeric = (value: unknown) => {
    if (typeof value === "number") {
      return value;
    }
    if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
      return value.toNumber();
    }

    return undefined;
  };

  const locationsNormalized = Array.isArray(posting.locationsNormalized)
    ? posting.locationsNormalized.filter(
        (value): value is NormalizedLocation =>
          Boolean(value) &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          typeof (value as NormalizedLocation).key === "string"
      )
    : [];

  return {
    companySlug: posting.company.slug,
    companyNameSnapshot: posting.companyNameSnapshot,
    companyBucket: posting.company.companyBucket as ListingSearchRecord["companyBucket"],
    title: posting.title,
    roleCategory: posting.roleCategory as ListingSearchRecord["roleCategory"],
    season: posting.season,
    year: posting.year,
    locationRaw: posting.locationRaw,
    locationsNormalized,
    locationCountries: posting.locationCountries,
    internshipFlag: posting.internshipFlag,
    newGradFlag: posting.newGradFlag,
    remoteType: posting.remoteType as ListingSearchRecord["remoteType"],
    compensationMin: toNumeric(posting.compensationMin),
    compensationMax: toNumeric(posting.compensationMax),
    isActive: posting.isActive,
    postingDate: posting.postingDate,
    discoveredAt: posting.discoveredAt
  };
}

