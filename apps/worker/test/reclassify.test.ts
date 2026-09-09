import { describe, expect, it } from "vitest";
import { classifyStoredPosting } from "../src/jobs/reclassify";

describe("classifyStoredPosting", () => {
  it("reclassifies a foreign new-grad role without dropping its location", () => {
    const result = classifyStoredPosting({
      title: "Software Engineer, New Grad",
      descriptionText: "Full-time entry-level role.",
      locationRaw: "London, United Kingdom",
      locationsNormalized: null,
      metadataJson: null
    });

    expect(result.internshipFlag).toBe(false);
    expect(result.newGradFlag).toBe(true);
    expect(result.locationCountries).toContain("GB");
  });

  it("gives internship classification precedence over new-grad language", () => {
    const result = classifyStoredPosting({
      title: "Software Engineer Intern",
      descriptionText: "New grad internship for students.",
      locationRaw: "Toronto, Canada",
      locationsNormalized: null,
      metadataJson: null
    });

    expect(result.internshipFlag).toBe(true);
    expect(result.newGradFlag).toBe(false);
    expect(result.locationCountries).toContain("CA");
  });

  it("recomputes locations from stored normalized values instead of stale country arrays", () => {
    const result = classifyStoredPosting({
      title: "Graduate Engineer",
      locationRaw: "Munich, Germany",
      locationsNormalized: [
        { raw: "Munich, Germany", display: "Munich, Germany", key: "munich-germany" }
      ],
      metadataJson: null
    });

    expect(result.locationCountries).toEqual(["DE"]);
  });
});
