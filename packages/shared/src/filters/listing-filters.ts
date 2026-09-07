import { z } from "zod";
import {
  COMPANY_BUCKETS,
  ISO_COUNTRY_CODES,
  LISTING_SORT_OPTIONS,
  POSITION_TYPES,
  REMOTE_TYPES,
  ROLE_CATEGORIES
} from "../constants/domain";
import type { ListingSearchRecord, NormalizedLocation } from "../types";
import { canonicalizeSearchText as canonicalizeText } from "../normalization/text";
import {
  isUsOrUnknownPostingLocation,
  normalizeLocations
} from "../normalization/location";

const isoCountryCodes = new Set(ISO_COUNTRY_CODES);
const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((code) => isoCountryCodes.has(code), "Expected an ISO 3166-1 alpha-2 country code");

export const listingFilterSchema = z.object({
  q: z.string().trim().optional(),
  companySlugs: z.array(z.string()).default([]),
  companyBuckets: z.array(z.enum(COMPANY_BUCKETS)).default([]),
  roleCategories: z.array(z.enum(ROLE_CATEGORIES)).default([]),
  seasons: z.array(z.string()).default([]),
  years: z.array(z.coerce.number().int()).default([]),
  locations: z.array(z.string().trim()).default([]),
  countries: z.array(countryCodeSchema).default([]),
  positionTypes: z.array(z.enum(POSITION_TYPES)).default([]),
  remoteTypes: z.array(z.enum(REMOTE_TYPES)).default([]),
  payKnown: z.enum(["all", "known", "unknown"]).default("all"),
  minimumPay: z.coerce.number().nonnegative().optional(),
  activeOnly: z.boolean().default(true),
  recentlyPostedDays: z.coerce.number().int().positive().optional(),
  // New searches include every country. Saved searches that want the legacy
  // behavior persist usOnly: true explicitly.
  usOnly: z.boolean().default(false),
  includeMissingLocation: z.boolean().default(true),
  includeMissingPay: z.boolean().default(true),
  sort: z.enum(LISTING_SORT_OPTIONS).default("postingDate")
});

export type ListingFilters = z.infer<typeof listingFilterSchema>;

function recordLocations(record: ListingSearchRecord): NormalizedLocation[] {
  const rawLocations = record.locationRaw ? normalizeLocations([record.locationRaw]) : [];
  const storedLocations = (record.locationsNormalized ?? []).filter(
    (location) => {
      const matchingRaw = rawLocations.find(
        (rawLocation) => canonicalizeText(rawLocation.raw) === canonicalizeText(location.raw)
      );

      // Replace a stale stored country when fresh raw parsing found a
      // structured country. Preserve an authoritative stored country when the
      // raw value is only a city or a remote label.
      return !matchingRaw || !matchingRaw.countryCode;
    }
  );
  const seenKeys = new Set<string>();

  return [...storedLocations, ...rawLocations].filter((location) => {
    if (seenKeys.has(location.key)) {
      return false;
    }

    seenKeys.add(location.key);
    return true;
  });
}

function attachSingleAuthoritativeCountry(
  record: ListingSearchRecord,
  locations: NormalizedLocation[]
): NormalizedLocation[] {
  if (locations.length !== 1 || (locations[0]?.countryCode && !locations[0]?.countryInferred)) {
    return locations;
  }

  const countryCodes = Array.from(
    new Set(
      (record.locationCountries ?? [])
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  return countryCodes.length === 1
    ? [{ ...locations[0], countryCode: countryCodes[0] }]
    : locations;
}

function locationText(location: NormalizedLocation): string {
  return canonicalizeText(
    [
      location.raw,
      location.display,
      location.key,
      location.city,
      location.region,
      location.country,
      location.countryCode
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function matchesSpecificLocation(location: NormalizedLocation, query: string): boolean {
  const normalizedQuery = canonicalizeText(query);

  return Boolean(normalizedQuery) && locationText(location).includes(normalizedQuery);
}

function normalizedRecordCountryCodes(
  record: ListingSearchRecord,
  locations: NormalizedLocation[]
): string[] {
  const fromLocations = Array.from(
    new Set(
      locations
        .map((location) => location.countryCode?.trim().toUpperCase())
        .filter((code): code is string => Boolean(code))
    )
  );

  // Older rows may not have locationsNormalized. Their locationCountries data
  // is still safe for a country-only filter, but is intentionally not attached
  // to a specific location when both filters are selected.
  if (fromLocations.length) {
    return fromLocations;
  }

  return (record.locationCountries ?? [])
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

function matchesPositionTypes(record: ListingSearchRecord, filters: ListingFilters): boolean {
  if (!filters.positionTypes.length) {
    return true;
  }

  return filters.positionTypes.some((positionType) =>
    positionType === "INTERNSHIP" ? record.internshipFlag === true : record.newGradFlag === true
  );
}

export function matchesListingFilters(record: ListingSearchRecord, filters: ListingFilters): boolean {
  if (filters.activeOnly && !record.isActive) {
    return false;
  }

  if (!matchesPositionTypes(record, filters)) {
    return false;
  }

  if (filters.q) {
    const query = canonicalizeText(filters.q);
    const haystack = canonicalizeText(
      `${record.companyNameSnapshot} ${record.title} ${record.locationRaw ?? ""} ${(record.locationsNormalized ?? []).map(locationText).join(" ")}`
    );

    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (filters.companySlugs.length && (!record.companySlug || !filters.companySlugs.includes(record.companySlug))) {
    return false;
  }

  if (filters.companyBuckets.length && !filters.companyBuckets.includes(record.companyBucket)) {
    return false;
  }

  if (filters.roleCategories.length && !filters.roleCategories.includes(record.roleCategory)) {
    return false;
  }

  if (filters.seasons.length && (!record.season || !filters.seasons.includes(record.season))) {
    return false;
  }

  if (filters.years.length && (!record.year || !filters.years.includes(record.year))) {
    return false;
  }

  const normalizedLocations = attachSingleAuthoritativeCountry(record, recordLocations(record));
  const specificLocationQueries = filters.locations.filter(Boolean);

  if (filters.countries.length || specificLocationQueries.length) {
    const countrySet = new Set(filters.countries.map((country) => country.toUpperCase()));

    if (countrySet.size && specificLocationQueries.length) {
      // Both constraints must be satisfied by the same normalized location.
      // This prevents a posting with locations in Canada and Germany from
      // matching country=CA plus location=Berlin.
      const matchesCombinedLocation = normalizedLocations.some(
        (location) =>
          Boolean(location.countryCode && countrySet.has(location.countryCode.toUpperCase())) &&
          specificLocationQueries.some((query) => matchesSpecificLocation(location, query))
      );

      if (!matchesCombinedLocation) {
        return false;
      }
    } else if (countrySet.size) {
      const countryCodes = normalizedRecordCountryCodes(record, normalizedLocations);

      if (!countryCodes.some((countryCode) => countrySet.has(countryCode))) {
        return false;
      }
    } else if (
      !normalizedLocations.some((location) =>
        specificLocationQueries.some((query) => matchesSpecificLocation(location, query))
      )
    ) {
      return false;
    }
  }

  if (filters.remoteTypes.length && !filters.remoteTypes.includes(record.remoteType)) {
    return false;
  }

  const hasPay = [record.compensationMin, record.compensationMax].some(
    (value) => typeof value === "number" && Number.isFinite(value)
  );

  if (filters.payKnown === "known" && !hasPay) {
    return false;
  }

  if (filters.payKnown === "unknown" && hasPay) {
    return false;
  }

  if (!filters.includeMissingPay && !hasPay) {
    return false;
  }

  const payValues = [record.compensationMin, record.compensationMax].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  const maxPay = payValues.length ? Math.max(...payValues) : undefined;

  if (
    typeof filters.minimumPay === "number" &&
    (typeof maxPay !== "number" || !Number.isFinite(maxPay) || maxPay < filters.minimumPay)
  ) {
    return false;
  }

  const locationCountries = record.locationCountries ?? [];

  if (filters.usOnly && !isUsOrUnknownPostingLocation(locationCountries, record.locationRaw)) {
    return false;
  }

  const hasLocation = Boolean(record.locationRaw?.trim()) || normalizedLocations.length > 0;

  if (!filters.includeMissingLocation && !hasLocation) {
    return false;
  }

  if (filters.recentlyPostedDays) {
    if (!record.postingDate || !Number.isFinite(record.postingDate.getTime())) {
      return false;
    }

    const ageMs = Date.now() - record.postingDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays > filters.recentlyPostedDays) {
      return false;
    }
  }

  return true;
}
