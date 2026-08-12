export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(value: string): string {
  const decodeCodePoint = (raw: string, radix: number, original: string): string => {
    const codePoint = Number.parseInt(raw, radix);

    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : original;
  };

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (original, codePoint: string) =>
      decodeCodePoint(codePoint, 10, original)
    )
    .replace(/&#x([0-9a-f]+);/gi, (original, codePoint: string) =>
      decodeCodePoint(codePoint, 16, original)
    );
}

export function stripHtml(value: string): string {
  return normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

export function canonicalizeText(value: string): string {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\s]+/g, " ")
  );
}

export function slugify(value: string): string {
  return canonicalizeText(value).replace(/\s+/g, "-");
}

export function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
