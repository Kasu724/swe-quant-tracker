import { describe, expect, it } from "vitest";
import { companySeeds, companySourceSeeds } from "../src/seed-data";

describe("database seed data", () => {
  it("has unique company slugs and valid public URLs", () => {
    const slugs = companySeeds.map((company) => company.slug);

    expect(new Set(slugs).size).toBe(slugs.length);

    for (const company of companySeeds) {
      for (const value of [company.websiteUrl, company.careersUrl].filter(Boolean)) {
        expect(new URL(value!).protocol).toMatch(/^https?:$/);
      }
    }
  });

  it("references known companies with unique source identities", () => {
    const companySlugs = new Set(companySeeds.map((company) => company.slug));
    const sourceKeys = companySourceSeeds.map(
      (source) => `${source.companySlug}:${source.sourceType}:${source.sourceIdentifier}`
    );

    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);

    for (const source of companySourceSeeds) {
      expect(companySlugs.has(source.companySlug)).toBe(true);
      expect(new URL(source.sourceUrl).protocol).toMatch(/^https?:$/);
      expect(source.sourceIdentifier.trim()).not.toBe("");
      expect(source.priority).toBeGreaterThan(0);
    }
  });

  it("seeds broad source queries for local classification", () => {
    expect(companySourceSeeds.find((source) => source.companySlug === "nvidia")?.requestConfigJson?.appliedFacets).toBeUndefined();
    expect(new URL(companySourceSeeds.find((source) => source.companySlug === "sap")!.sourceUrl).searchParams.has("keywords")).toBe(false);
    expect(companySourceSeeds.find((source) => source.companySlug === "splunk")?.requestConfigJson?.query).toBe("splunk");
    for (const source of companySourceSeeds) {
      const sourceUrl = new URL(source.sourceUrl);

      for (const value of sourceUrl.searchParams.values()) {
        expect(value).not.toMatch(/\b(?:intern(?:ship)?|new\s*grad(?:uate)?|early\s*career|graduate)\b/i);
      }

      const config = source.requestConfigJson ?? {};

      for (const key of ["query", "searchText", "keywords"]) {
        const value = config[key];

        expect(typeof value !== "string" || !/\b(?:intern(?:ship)?|new\s*grad(?:uate)?|early\s*career|graduate)\b/i.test(value)).toBe(true);
      }

      expect(config.countryName === undefined || config.countryName === "").toBe(true);
      expect(config.selectedLocationsFacet === undefined || config.selectedLocationsFacet === "").toBe(true);
    }
  });
});
