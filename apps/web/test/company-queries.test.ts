import { describe, expect, it } from "vitest";
import { parseCompaniesPage } from "../lib/company-queries";

describe("company page query parsing", () => {
  it("defaults malformed, repeated, and out-of-range values to the first page", () => {
    expect(parseCompaniesPage(undefined)).toBe(1);
    expect(parseCompaniesPage("0")).toBe(1);
    expect(parseCompaniesPage("-2")).toBe(1);
    expect(parseCompaniesPage("2.5")).toBe(1);
    expect(parseCompaniesPage("not-a-page")).toBe(1);
    expect(parseCompaniesPage("9007199254740992")).toBe(1);
    expect(parseCompaniesPage(["3", "4"])).toBe(3);
  });

  it("accepts positive integer pages", () => {
    expect(parseCompaniesPage("1")).toBe(1);
    expect(parseCompaniesPage("24")).toBe(24);
  });
});
