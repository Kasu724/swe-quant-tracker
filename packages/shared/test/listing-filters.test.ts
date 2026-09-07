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
  it("includes worldwide postings by default and preserves explicit US-only filtering", () => {
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

  it("includes known non-US postings when usOnly is disabled", () => {
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
    ).toBe(true);
  });

  it("uses raw location text to reject non-US postings with stale country data", () => {
    const filters = listingFilterSchema.parse({ usOnly: true });

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

  it("requires country and specific location to match one normalized location", () => {
    const filters = listingFilterSchema.parse({ countries: ["CA"], locations: ["Berlin"] });
    const record: ListingSearchRecord = {
      ...baseRecord,
      locationRaw: "Toronto, Ontario, Canada | Berlin, Germany",
      locationCountries: ["CA", "DE"]
    };

    expect(matchesListingFilters(record, filters)).toBe(false);
    expect(
      matchesListingFilters(
        { ...record, locationRaw: "Toronto, Ontario, Canada | Montreal, Quebec, Canada" },
        filters
      )
    ).toBe(false);
  });

  it("matches country filters using normalized locations and does not match remote or unknown locations", () => {
    const canada = listingFilterSchema.parse({ countries: ["CA"] });

    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Remote",
          locationCountries: ["US"]
        },
        canada
      )
    ).toBe(false);
    expect(matchesListingFilters({ ...baseRecord, locationRaw: "Remote", locationCountries: ["CA"] }, canada)).toBe(true);
    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Toronto, ON",
          locationCountries: []
        },
        canada
      )
    ).toBe(true);
    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Paris, TX",
          locationCountries: ["FR"],
          locationsNormalized: [
            { raw: "Paris, TX", display: "Paris, TX", key: "paris-tx-france", countryCode: "FR" }
          ]
        },
        listingFilterSchema.parse({ countries: ["US"] })
      )
    ).toBe(true);
    expect(
      matchesListingFilters(
        { ...baseRecord, locationRaw: "Mountain View", locationCountries: ["US"] },
        listingFilterSchema.parse({ countries: ["US"] })
      )
    ).toBe(true);
    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Mountain View",
          locationCountries: ["US"]
        },
        listingFilterSchema.parse({ countries: ["US"], locations: ["Mountain View"] })
      )
    ).toBe(true);
    expect(
      matchesListingFilters(
        {
          ...baseRecord,
          locationRaw: "Remote",
          locationCountries: ["CA"]
        },
        listingFilterSchema.parse({ countries: ["CA"], locations: ["Remote"] })
      )
    ).toBe(true);
  });

  it("supports position type filters and treats zero compensation as known", () => {
    const filters = listingFilterSchema.parse({
      positionTypes: ["INTERNSHIP"],
      payKnown: "known",
      minimumPay: 0
    });

    expect(
      matchesListingFilters(
        { ...baseRecord, internshipFlag: true, newGradFlag: false, compensationMin: 0 },
        filters
      )
    ).toBe(true);
    expect(
      matchesListingFilters(
        { ...baseRecord, internshipFlag: false, newGradFlag: true, compensationMin: 0 },
        filters
      )
    ).toBe(false);
  });

  it("excludes missing dates from a recent-postings filter", () => {
    const filters = listingFilterSchema.parse({ recentlyPostedDays: 7 });

    expect(matchesListingFilters({ ...baseRecord, postingDate: undefined }, filters)).toBe(false);
  });

  it.each([
    ["query", { q: "amazon" }, true],
    ["company", { companySlugs: ["microsoft"] }, false],
    ["bucket", { companyBuckets: ["QUANT"] }, false],
    ["category", { roleCategories: ["TRADING"] }, false],
    ["season", { seasons: ["WINTER"] }, false],
    ["year", { years: [2027] }, false],
    ["remote", { remoteTypes: ["REMOTE"] }, false],
    ["active", { activeOnly: true }, true]
  ] as const)("applies the %s filter", (_name, input, expected) => {
    expect(matchesListingFilters(baseRecord, listingFilterSchema.parse(input))).toBe(expected);
  });

  it("handles pay-known, missing-pay, and minimum-pay combinations", () => {
    const zeroPay = { ...baseRecord, compensationMin: 0 };
    const unknownPay = { ...baseRecord, compensationMin: undefined, compensationMax: undefined };

    expect(matchesListingFilters(zeroPay, listingFilterSchema.parse({ payKnown: "known" }))).toBe(true);
    expect(matchesListingFilters(zeroPay, listingFilterSchema.parse({ payKnown: "unknown" }))).toBe(false);
    expect(matchesListingFilters(unknownPay, listingFilterSchema.parse({ payKnown: "unknown" }))).toBe(true);
    expect(matchesListingFilters(unknownPay, listingFilterSchema.parse({ includeMissingPay: false }))).toBe(false);
    expect(matchesListingFilters(zeroPay, listingFilterSchema.parse({ minimumPay: 0 }))).toBe(true);
    expect(matchesListingFilters(zeroPay, listingFilterSchema.parse({ minimumPay: 1 }))).toBe(false);
    expect(
      matchesListingFilters(
        { ...baseRecord, compensationMin: 100, compensationMax: Number.NaN },
        listingFilterSchema.parse({ minimumPay: 100 })
      )
    ).toBe(true);
  });

  it("supports active-only and missing-location controls", () => {
    expect(
      matchesListingFilters(
        { ...baseRecord, isActive: false },
        listingFilterSchema.parse({ activeOnly: false })
      )
    ).toBe(true);
    expect(
      matchesListingFilters(
        { ...baseRecord, locationRaw: "   ", locationsNormalized: [] },
        listingFilterSchema.parse({ includeMissingLocation: false })
      )
    ).toBe(false);
    expect(
      matchesListingFilters(
        { ...baseRecord, locationRaw: null, locationsNormalized: [{ raw: "Tokyo", display: "Tokyo", key: "tokyo", countryCode: "JP" }] },
        listingFilterSchema.parse({ includeMissingLocation: false })
      )
    ).toBe(true);
  });

  it("matches either selected position type and supports both flags", () => {
    const internship = { ...baseRecord, internshipFlag: true, newGradFlag: false };
    const newGrad = { ...baseRecord, internshipFlag: false, newGradFlag: true };
    const both = listingFilterSchema.parse({ positionTypes: ["INTERNSHIP", "NEW_GRAD"] });

    expect(matchesListingFilters(internship, listingFilterSchema.parse({ positionTypes: ["INTERNSHIP"] }))).toBe(true);
    expect(matchesListingFilters(internship, listingFilterSchema.parse({ positionTypes: ["NEW_GRAD"] }))).toBe(false);
    expect(matchesListingFilters(newGrad, listingFilterSchema.parse({ positionTypes: ["NEW_GRAD"] }))).toBe(true);
    expect(matchesListingFilters(newGrad, listingFilterSchema.parse({ positionTypes: ["INTERNSHIP"] }))).toBe(false);
    expect(matchesListingFilters(internship, both)).toBe(true);
    expect(matchesListingFilters(newGrad, both)).toBe(true);
  });

  it("rejects postings outside the recent date window and accepts the boundary", () => {
    const filters = listingFilterSchema.parse({ recentlyPostedDays: 7 });
    const now = Date.now();

    expect(matchesListingFilters({ ...baseRecord, postingDate: new Date(now - 6 * 86_400_000) }, filters)).toBe(true);
    expect(matchesListingFilters({ ...baseRecord, postingDate: new Date(now - 8 * 86_400_000) }, filters)).toBe(false);
  });
});
