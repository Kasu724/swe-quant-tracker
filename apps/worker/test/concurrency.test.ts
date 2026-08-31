import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../src/lib/concurrency";

describe("concurrency helpers", () => {
  it("bounds active handlers and returns results in input order", async () => {
    let active = 0;
    let maximumActive = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);

      await new Promise((resolve) => setTimeout(resolve, value === 1 ? 20 : 5));

      active -= 1;
      return value * 10;
    });

    expect(maximumActive).toBe(2);
    expect(results).toEqual([10, 20, 30, 40, 50, 60]);
    expect(active).toBe(0);
  });
});
