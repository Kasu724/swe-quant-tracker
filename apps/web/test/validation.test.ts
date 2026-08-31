import { describe, expect, it } from "vitest";
import {
  isHttpUrl,
  isPrismaErrorCode,
  isValidTimeZone,
  readJsonObject,
  safeExternalUrl,
  safeInternalPath
} from "../lib/validation";

describe("web input validation", () => {
  it("allows only HTTP(S) external URLs", () => {
    expect(isHttpUrl("https://example.com/job")).toBe(true);
    expect(isHttpUrl("http://example.com/job")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,bad")).toBe(false);
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
  });

  it("allows local redirects and rejects protocol-relative or malformed paths", () => {
    expect(safeInternalPath("/internships?q=quant", "/fallback")).toBe(
      "/internships?q=quant"
    );
    expect(safeInternalPath("//attacker.test", "/fallback")).toBe("/fallback");
    expect(safeInternalPath("/\\attacker.test", "/fallback")).toBe("/fallback");
    expect(safeInternalPath("https://attacker.test", "/fallback")).toBe("/fallback");
  });

  it("validates IANA timezone identifiers", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/A_Real_Zone")).toBe(false);
  });

  it("returns only JSON objects from request bodies", async () => {
    const objectRequest = new Request("https://example.test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postingId: "abc" })
    });
    const arrayRequest = new Request("https://example.test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "[]"
    });
    const invalidRequest = new Request("https://example.test", {
      method: "POST",
      body: "not-json"
    });

    await expect(readJsonObject(objectRequest)).resolves.toEqual({ postingId: "abc" });
    await expect(readJsonObject(arrayRequest)).resolves.toBeNull();
    await expect(readJsonObject(invalidRequest)).resolves.toBeNull();
  });

  it("recognizes Prisma errors without relying on fragile instanceof checks", () => {
    expect(isPrismaErrorCode({ code: "P2002" }, "P2002")).toBe(true);
    expect(isPrismaErrorCode({ code: "P2003" }, "P2002")).toBe(false);
    expect(isPrismaErrorCode(new Error("P2002"), "P2002")).toBe(false);
  });
});
