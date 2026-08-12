import { describe, expect, it } from "vitest";
import { getPostingUrlCandidates, getPreferredPostingUrl } from "../src/posting-links";

describe("posting links", () => {
  it("prefers the public source URL when both URLs are present", () => {
    expect(
      getPreferredPostingUrl({
        sourceUrl: "https://company.com/jobs/123",
        applicationUrl: "https://company.com/jobs/123/apply"
      })
    ).toBe("https://company.com/jobs/123");
  });

  it("falls back to the application URL when no source URL is available", () => {
    expect(
      getPreferredPostingUrl({
        sourceUrl: "",
        applicationUrl: "https://company.com/jobs/123/apply"
      })
    ).toBe("https://company.com/jobs/123/apply");
  });

  it("deduplicates identical candidate URLs", () => {
    expect(
      getPostingUrlCandidates({
        sourceUrl: "https://company.com/jobs/123",
        applicationUrl: "https://company.com/jobs/123"
      })
    ).toEqual(["https://company.com/jobs/123"]);
  });

  it("rejects unsafe and credential-bearing URLs", () => {
    expect(
      getPostingUrlCandidates({
        sourceUrl: "javascript:alert(1)",
        applicationUrl: "https://user:secret@company.com/jobs/123"
      })
    ).toEqual([]);
  });
});
