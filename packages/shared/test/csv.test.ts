import { describe, expect, it } from "vitest";
import { serializeRowsToCsv } from "../src/csv/export";

describe("CSV serialization", () => {
  it("escapes delimiters, quotes, and CRLF values", () => {
    expect(serializeRowsToCsv([{ name: "A, B", note: "line 1\r\nline \"2\"" }])).toBe(
      'name,note\n"A, B","line 1\r\nline ""2"""'
    );
  });

  it("neutralizes spreadsheet formulas in untrusted fields", () => {
    expect(serializeRowsToCsv([{ company: "=HYPERLINK(\"https://evil.test\")" }])).toBe(
      'company\n"\'=HYPERLINK(""https://evil.test"")"'
    );
  });

  it("emits explicit headers for an empty export", () => {
    expect(serializeRowsToCsv([], ["company", "title"])).toBe("company,title");
  });
});
