import { uniqueStrings } from "./normalization/text";

function normalizeUrl(value?: string | null): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
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
