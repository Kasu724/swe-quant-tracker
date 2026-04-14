import { describe, expect, it } from "vitest";
import { computeDedupeFingerprint, isPotentialDuplicate } from "../src/normalization/dedupe";

describe("dedupe helpers", () => {
  it("builds stable fingerprints", () => {
    expect(
      computeDedupeFingerprint({
        companyName: "Stripe",
        title: "Software Engineer Intern, Summer 2027",
        locationKeys: ["new-york-new-york-united-states"],
        season: "SUMMER",
        year: 2027
      })
    ).toContain("stripe");
  });

  it("matches near-duplicate roles", () => {
    expect(
      isPotentialDuplicate(
        {
          companyName: "Stripe",
          title: "Software Engineer Intern",
          locationKeys: ["new-york-new-york-united-states"],
          season: "SUMMER",
          year: 2027
        },
        {
          companyName: "Stripe",
          title: "Software Engineering Intern",
          locationKeys: ["new-york-new-york-united-states"],
          season: "SUMMER",
          year: 2027
        }
      )
    ).toBe(true);
  });
});

