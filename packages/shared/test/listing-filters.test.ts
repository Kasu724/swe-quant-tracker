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
  it("keeps only confirmed US postings when usOnly is enabled", () => {
    const filters = listingFilterSchema.parse({ usOnly: true });

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

  it("excludes postings with unknown country data when usOnly is enabled", () => {
    const filters = listingFilterSchema.parse({ usOnly: true });

    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Barcelona, Catalonia, Spain",
          locationCountries: []
        },
        filters
      )
    ).toBe(false);
  });
});
