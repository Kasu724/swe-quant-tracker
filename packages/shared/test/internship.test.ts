import { describe, expect, it } from "vitest";
import { isInternshipPosting } from "../src/normalization/internship";

describe("isInternshipPosting", () => {
  it("detects explicit internship roles", () => {
    expect(isInternshipPosting("Software Engineering Intern", "Summer internship")).toBe(true);
  });

  it("detects student pipeline descriptions", () => {
    expect(isInternshipPosting("Quantitative Developer", "Open to undergraduate students")).toBe(true);
  });

  it("excludes new grad roles by default", () => {
    expect(isInternshipPosting("Software Engineer, New Grad", "Full-time role")).toBe(false);
  });
});

