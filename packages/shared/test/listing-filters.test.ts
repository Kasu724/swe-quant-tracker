import { describe, expect, it } from "vitest";
import { matchesListingFilters, listingFilterSchema } from "../src/filters/listing-filters";
import type { ListingSearchRecord } from "../src/types";

const baseRecord: ListingSearchRecord = {
  companySlug: "amazon",
  companyNameSnapshot: "Amazon",
  companyBucket: "FAANG",
  title: "Software Development Engineer Intern",
  roleCategory: "SWE",
  season: "SUMMER",
  year: 2026,
  locationRaw: "Seattle, Washington, United States",
  locationCountries: ["US"],
  remoteType: "ONSITE",
  isActive: true
};

describe("listing filters", () => {
  it("keeps US postings and excludes known non-US postings by default", () => {
    const filters = listingFilterSchema.parse({});

    expect(matchesListingFilters(baseRecord, filters)).toBe(true);
    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Madrid, Community of Madrid, Spain",
          locationCountries: ["ES"]
        },
        filters
      )
    ).toBe(false);
  });

  it("keeps postings with unknown location data", () => {
    const filters = listingFilterSchema.parse({});

    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: undefined,
          locationCountries: []
        },
        filters
      )
    ).toBe(true);
  });

  it("excludes known non-US postings even when usOnly is disabled", () => {
    const filters = listingFilterSchema.parse({ usOnly: false });

    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Toronto, Canada",
          locationCountries: ["CA"]
        },
        filters
      )
    ).toBe(false);
  });

  it("uses raw location text to reject non-US postings with stale country data", () => {
    const filters = listingFilterSchema.parse({});

    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Remote - Canada",
          locationCountries: []
        },
        filters
      )
    ).toBe(false);
  });
});
