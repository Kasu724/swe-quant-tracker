import { describe, expect, it } from "vitest";
import { isInternshipPosting } from "../src/normalization/internship";

describe("isInternshipPosting", () => {
  it("detects explicit internship roles", () => {
    expect(isInternshipPosting("Software Engineering Intern", "Summer internship")).toBe(true);
  });

  it("detects student roles with explicit title signals", () => {
    expect(isInternshipPosting("Working Student, Software Engineering", "Part-time during the semester")).toBe(true);
  });

  it("keeps explicit internship titles even when the function name contains manager or coordinator", () => {
    expect(isInternshipPosting("Product Manager Intern", "Summer 2026 internship")).toBe(true);
    expect(isInternshipPosting("Operations Coordinator Intern", "12-week internship")).toBe(true);
  });

  it("excludes new grad roles by default", () => {
    expect(isInternshipPosting("Software Engineer, New Grad", "Full-time role")).toBe(false);
  });

  it("does not treat generic student-pipeline copy as an internship", () => {
    expect(isInternshipPosting("Quantitative Developer", "Open to undergraduate students")).toBe(false);
  });

  it("excludes recruiting and event roles even if they mention internship programs", () => {
    expect(
      isInternshipPosting("Campus Recruiter", "Help run the company's internship program and recruiting events.")
    ).toBe(false);
  });

  it("excludes early-career full-time roles", () => {
    expect(
      isInternshipPosting("Software Engineer, Early Career", "Join our full-time engineering program.")
    ).toBe(false);
  });

  it("excludes returnships even if the title contains intern", () => {
    expect(isInternshipPosting("Intern - Returnship - Portfolio Manager", "Restart your career program")).toBe(
      false
    );
  });

  it("allows descriptions that explicitly say the role is an internship", () => {
    expect(
      isInternshipPosting("Software Engineer", "This 12-week internship is for students graduating in 2027.")
    ).toBe(true);
  });

  it("does not treat prior internship experience requirements as an internship signal", () => {
    expect(
      isInternshipPosting(
        "Software Engineer",
        "This full-time role prefers candidates with previous internship experience."
      )
    ).toBe(false);
  });

  it("allows structured employment type signals to qualify a generic internship title", () => {
    expect(
      isInternshipPosting("Software Engineer", undefined, {
        employmentType: "Internship"
      })
    ).toBe(true);
  });

  it("does not treat generic campus metadata as an internship by itself", () => {
    expect(
      isInternshipPosting(
        "Prediction Markets Trader",
        "This role is targeted at strong campus hires and new graduates.",
        {
          employmentType: "Full-time",
          metadata: {
            careerCategories: ["Campus", "Trading"]
          }
        }
      )
    ).toBe(false);
  });
});
