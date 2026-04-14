import { describe, expect, it } from "vitest";
import { parseCompensation } from "../src/normalization/compensation";

describe("parseCompensation", () => {
  it("parses hourly ranges", () => {
    const result = parseCompensation("$35 - $42 / hr");

    expect(result.min).toBe(35);
    expect(result.max).toBe(42);
    expect(result.interval).toBe("HOUR");
    expect(result.currency).toBe("USD");
  });

  it("parses annual k-suffixed salaries", () => {
    const result = parseCompensation("Estimated based on experience $81K - $87K");

    expect(result.min).toBe(81000);
    expect(result.max).toBe(87000);
  });
});

