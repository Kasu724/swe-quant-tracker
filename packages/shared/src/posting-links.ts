import { uniqueStrings } from "./normalization/text";

function normalizeUrl(value?: string | null): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  try {
    const url = new URL(normalized);

    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export function getPostingUrlCandidates(input: {
  sourceUrl?: string | null;
  applicationUrl?: string | null;
}): string[] {
  return uniqueStrings([normalizeUrl(input.sourceUrl), normalizeUrl(input.applicationUrl)]);
}

export function getPreferredPostingUrl(input: {
  sourceUrl?: string | null;
  applicationUrl?: string | null;
}): string | undefined {
  return getPostingUrlCandidates(input)[0];
}
