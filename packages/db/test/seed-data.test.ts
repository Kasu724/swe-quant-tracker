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
});
