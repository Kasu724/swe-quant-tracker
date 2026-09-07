import { describe, expect, it } from "vitest";
import { isInternshipPosting, isNewGradPosting } from "../src/normalization/internship";

describe("isInternshipPosting", () => {
  it("detects explicit internship roles", () => {
    expect(isInternshipPosting("Software Engineering Intern", "Summer internship")).toBe(true);
  });

  it("detects student roles with explicit title signals", () => {
    expect(isInternshipPosting("Working Student, Software Engineering", "Part-time during the semester")).toBe(true);
    expect(isInternshipPosting("Student Researcher, PhD, Summer 2026", "Student opportunity")).toBe(true);
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

  it("does not treat source search metadata as an internship signal", () => {
    expect(
      isInternshipPosting("Software Engineer", "General engineering role.", {
        metadata: {
          searchQuery: "intern"
        }
      })
    ).toBe(false);
  });

  it("does not treat internship-program support work as an internship", () => {
    expect(
      isInternshipPosting(
        "Program Manager",
        "This role will coordinate internship programs and campus recruiting events."
      )
    ).toBe(false);
  });
});

describe("isNewGradPosting", () => {
  it("detects explicit new graduate and entry-level roles", () => {
    expect(isNewGradPosting("Software Engineer, New Grad", "Full-time role")).toBe(true);
    expect(isNewGradPosting("Entry-level Quantitative Developer", "Join our trading team.")).toBe(true);
    expect(isNewGradPosting("Graduate Trader", "Work with senior traders.")).toBe(true);
    expect(isNewGradPosting("Quantitative Researcher - Graduate", "Join our research team.")).toBe(true);
    expect(isNewGradPosting("Graduate Engineer", "Join our engineering team.")).toBe(true);
  });

  it("detects graduate intent in role copy", () => {
    expect(
      isNewGradPosting("Software Engineer", "This role is designed for recent graduates.")
    ).toBe(true);
  });

  it("rejects experienced roles that only mention a degree or graduates", () => {
    expect(isNewGradPosting("Senior Software Engineer", "Recent graduates may apply.")).toBe(false);
    expect(isNewGradPosting("Software Engineer", "Work with senior engineers and a hiring manager.")).toBe(false);
    expect(isNewGradPosting("Software Engineer", "Candidates should be graduates from a university.")).toBe(false);
    expect(isNewGradPosting("Software Engineer", "Requires 5+ years of experience.")).toBe(false);
  });

  it("uses structured early-career metadata", () => {
    expect(
      isNewGradPosting("Software Engineer", undefined, {
        metadata: { careerLevel: "Entry Level" }
      })
    ).toBe(true);
  });
});
