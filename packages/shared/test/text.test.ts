import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "../src/normalization/text";

describe("HTML entity decoding", () => {
  it("decodes named and numeric entities case-insensitively", () => {
    expect(decodeHtmlEntities("A&amp;B &NBSP; &#x1F680;")).toBe("A&B   🚀");
  });

  it("leaves invalid Unicode code points intact instead of throwing", () => {
    expect(decodeHtmlEntities("bad: &#99999999; and &#xFFFFFF;")).toBe(
      "bad: &#99999999; and &#xFFFFFF;"
    );
  });
});
