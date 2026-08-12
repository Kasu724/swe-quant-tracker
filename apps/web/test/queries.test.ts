import { describe, expect, it } from "vitest";
import { parseListingFilters } from "../lib/queries";

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
});
