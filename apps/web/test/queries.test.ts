import { describe, expect, it } from "vitest";
import { buildListingFilterQuery, parseListingFilters } from "../lib/listing-filter-params";

describe("web listing query parsing", () => {
  it("supports clearing default-on checkbox filters", () => {
    const filters = parseListingFilters({
      activeOnly: "false",
      includeMissingLocation: "false",
      includeMissingPay: "false"
    });

    expect(filters.activeOnly).toBe(false);
    expect(filters.includeMissingLocation).toBe(false);
    expect(filters.includeMissingPay).toBe(false);
  });

  it("uses the submitted checkbox value after its hidden false fallback", () => {
    const filters = parseListingFilters({
      activeOnly: ["false", "on"],
      includeMissingLocation: ["false", "on"],
      includeMissingPay: ["false", "on"]
    });

    expect(filters.activeOnly).toBe(true);
    expect(filters.includeMissingLocation).toBe(true);
    expect(filters.includeMissingPay).toBe(true);
  });

  it("ignores malformed years rather than crashing the feed", () => {
    const filters = parseListingFilters({ year: ["2027", "not-a-year"] });
    expect(filters.years).toEqual([2027]);
  });

  it("parses country, specific location, and position type together", () => {
    const filters = parseListingFilters({
      country: "CA",
      location: "London, Ontario",
      positionType: ["INTERNSHIP", "NEW_GRAD"]
    });

    expect(filters.countries).toEqual(["CA"]);
    expect(filters.locations).toEqual(["London, Ontario"]);
    expect(filters.positionTypes).toEqual(["INTERNSHIP", "NEW_GRAD"]);
    expect(filters.usOnly).toBe(false);
  });

  it("preserves explicit legacy usOnly and lets a country selection override it", () => {
    expect(parseListingFilters({ usOnly: "true" }).usOnly).toBe(true);
    expect(parseListingFilters({ usOnly: "true", country: "CA" }).usOnly).toBe(false);
  });

  it("round-trips persisted filters through the feed query format", () => {
    const filters = parseListingFilters({
      q: "market maker",
      company: ["citadel", "jane-street"],
      category: "QUANT_RESEARCH",
      year: "2027",
      country: "CA",
      location: "Toronto, Ontario",
      positionType: ["INTERNSHIP", "NEW_GRAD"],
      remote: "HYBRID",
      payKnown: "known",
      minimumPay: "35",
      activeOnly: "false",
      includeMissingLocation: "false",
      includeMissingPay: "false",
      sort: "pay"
    });
    const searchParams: Record<string, string | string[]> = {};
    const serialized = new URLSearchParams(buildListingFilterQuery(filters));

    for (const key of new Set(serialized.keys())) {
      searchParams[key] = serialized.getAll(key);
    }

    expect(parseListingFilters(searchParams)).toEqual(filters);
  });
});
