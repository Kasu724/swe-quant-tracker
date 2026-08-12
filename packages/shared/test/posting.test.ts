import { describe, expect, it } from "vitest";
import { normalizeFetchedPosting } from "../src/normalization/posting";

function normalizePosting(overrides: {
  postingDate?: string | Date | null;
  applicationUrl?: string;
  sourceUrl?: string;
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
      title: "Software Engineer Intern",
      applicationUrl: overrides.applicationUrl ?? "https://example.com/jobs/123/apply",
      sourceUrl: overrides.sourceUrl ?? "https://example.com/jobs/123",
      postingDate: overrides.postingDate,
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
});
