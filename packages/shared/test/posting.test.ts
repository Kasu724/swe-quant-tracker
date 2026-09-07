import { describe, expect, it } from "vitest";
import { normalizeFetchedPosting } from "../src/normalization/posting";

function normalizePosting(overrides: {
  postingDate?: string | Date | null;
  applicationUrl?: string;
  sourceUrl?: string;
  title?: string;
  descriptionText?: string;
} = {}) {
  return normalizeFetchedPosting({
    company: { name: "Example", slug: "example" },
    source: {
      sourceType: "GREENHOUSE",
      sourceName: "Example board",
      sourceIdentifier: "example",
      sourceUrl: "https://example.com/jobs"
    },
    posting: {
      externalJobId: "job-123",
      title: overrides.title ?? "Software Engineer Intern",
      applicationUrl: overrides.applicationUrl ?? "https://example.com/jobs/123/apply",
      sourceUrl: overrides.sourceUrl ?? "https://example.com/jobs/123",
      postingDate: overrides.postingDate,
      descriptionText: overrides.descriptionText,
      raw: {}
    }
  });
}

describe("posting normalization", () => {
  it("drops invalid dates instead of producing invalid Prisma values", () => {
    const posting = normalizePosting({ postingDate: "not-a-date" });

    expect(posting.postingDate).toBeUndefined();
    expect(posting.year).toBeUndefined();
  });

  it("drops unsafe URLs so ingestion can skip the posting", () => {
    const posting = normalizePosting({
      applicationUrl: "javascript:alert(1)",
      sourceUrl: "https://user:password@example.com/jobs/123"
    });

    expect(posting.applicationUrl).toBe("");
    expect(posting.sourceUrl).toBeUndefined();
  });

  it("normalizes valid URLs and trims surrounding whitespace", () => {
    const posting = normalizePosting({
      applicationUrl: "  https://example.com/jobs/123/apply  "
    });

    expect(posting.applicationUrl).toBe("https://example.com/jobs/123/apply");
  });

  it("classifies new-graduate roles while keeping internships authoritative", () => {
    const newGrad = normalizePosting({
      title: "Software Engineer, New Grad",
      descriptionText: "Full-time entry-level role"
    });
    const intern = normalizePosting({
      title: "Software Engineer Intern",
      descriptionText: "New grad internship for students"
    });

    expect(newGrad.internshipFlag).toBe(false);
    expect(newGrad.newGradFlag).toBe(true);
    expect(intern.internshipFlag).toBe(true);
    expect(intern.newGradFlag).toBe(false);
  });
});
