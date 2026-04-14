import { z } from "zod";
import {
  COMPANY_BUCKETS,
  LISTING_SORT_OPTIONS,
  REMOTE_TYPES,
  ROLE_CATEGORIES
} from "../constants/domain";
import type { ListingSearchRecord } from "../types";
import { canonicalizeText } from "../normalization/text";

export const listingFilterSchema = z.object({
  q: z.string().trim().optional(),
  companySlugs: z.array(z.string()).default([]),
  companyBuckets: z.array(z.enum(COMPANY_BUCKETS)).default([]),
  roleCategories: z.array(z.enum(ROLE_CATEGORIES)).default([]),
  seasons: z.array(z.string()).default([]),
  years: z.array(z.coerce.number().int()).default([]),
  locations: z.array(z.string()).default([]),
  remoteTypes: z.array(z.enum(REMOTE_TYPES)).default([]),
  payKnown: z.enum(["all", "known", "unknown"]).default("all"),
  minimumPay: z.coerce.number().nonnegative().optional(),
  activeOnly: z.boolean().default(true),
  recentlyPostedDays: z.coerce.number().int().positive().optional(),
  usOnly: z.boolean().default(false),
  includeMissingLocation: z.boolean().default(true),
  includeMissingPay: z.boolean().default(true),
  sort: z.enum(LISTING_SORT_OPTIONS).default("newest")
});

export type ListingFilters = z.infer<typeof listingFilterSchema>;

export function matchesListingFilters(record: ListingSearchRecord, filters: ListingFilters): boolean {
  if (filters.activeOnly && !record.isActive) {
    return false;
  }

  if (filters.q) {
    const query = canonicalizeText(filters.q);
    const haystack = canonicalizeText(
      `${record.companyNameSnapshot} ${record.title} ${record.locationRaw ?? ""}`
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

  if (filters.locations.length) {
    const locationText = canonicalizeText(record.locationRaw ?? "");
    const matchesLocation = filters.locations.some((location) =>
      locationText.includes(canonicalizeText(location))
    );

    if (!matchesLocation) {
      return false;
    }
  }

  if (filters.remoteTypes.length && !filters.remoteTypes.includes(record.remoteType)) {
    return false;
  }

  const hasPay = typeof record.compensationMin === "number" || typeof record.compensationMax === "number";

  if (filters.payKnown === "known" && !hasPay) {
    return false;
  }

  if (filters.payKnown === "unknown" && hasPay) {
    return false;
  }

  if (!filters.includeMissingPay && !hasPay) {
    return false;
  }

  const maxPay = record.compensationMax ?? record.compensationMin;

  if (typeof filters.minimumPay === "number" && (!maxPay || maxPay < filters.minimumPay)) {
    return false;
  }

  const locationCountries = record.locationCountries ?? [];

  if (filters.usOnly) {
    if (locationCountries.length === 0) {
      return false;
    }

    if (locationCountries.some((code) => code !== "US")) {
      return false;
    }
  }

  if (!filters.includeMissingLocation && !record.locationRaw) {
    return false;
  }

  if (filters.recentlyPostedDays && record.postingDate) {
    const ageMs = Date.now() - record.postingDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays > filters.recentlyPostedDays) {
      return false;
    }
  }

  return true;
}
