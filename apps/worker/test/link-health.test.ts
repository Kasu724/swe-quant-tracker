import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectPostingUrl, resolvePostingUrl } from "../src/lib/link-health";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("posting link health", () => {
  it("only classifies explicit gone responses as conclusively dead", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("gone", { status: 410 }))
    );

    await expect(
      resolvePostingUrl({ applicationUrl: "https://example.com/job" })
    ).resolves.toEqual({ conclusiveDead: true });
  });

  it("keeps a posting active when all link failures are inconclusive", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("temporarily unavailable", { status: 503 }))
    );

    await expect(
      resolvePostingUrl({ applicationUrl: "https://example.com/job" })
    ).resolves.toEqual({ conclusiveDead: false });
  });

  it("tries a fallback URL after an inconclusive primary URL", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary DNS failure"))
      .mockResolvedValueOnce(
        new Response("live", {
          status: 200,
          headers: { "Content-Type": "text/plain" }
        })
      );
    vi.stubGlobal("fetch", fetchImpl);

    await expect(
      resolvePostingUrl({
        sourceUrl: "https://example.com/source",
        applicationUrl: "https://example.com/apply"
      })
    ).resolves.toEqual({
      url: "https://example.com/apply",
      conclusiveDead: false
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("treats access controls and rate limits as evidence that the page exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    await expect(inspectPostingUrl("https://example.com/job")).resolves.toMatchObject({
      ok: true,
      outcome: "live",
      status: 429
    });
  });

  it("detects explicit expired-job text in a successful page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("This job is no longer available", {
          status: 200,
          headers: { "Content-Type": "text/html" }
        })
      )
    );

    await expect(inspectPostingUrl("https://example.com/job")).resolves.toMatchObject({
      ok: false,
      outcome: "dead",
      reason: "dead-content"
    });
  });
});
