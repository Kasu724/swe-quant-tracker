import type { InternshipSeasonValue } from "../types";
import { normalizeTitle } from "./role";
import { canonicalizeText, uniqueStrings } from "./text";

type DedupeFingerprintInput = {
  companyName: string;
  title: string;
  locationKeys?: string[];
  season?: string;
  year?: number;
};

type DuplicateCandidate = {
  companyName: string;
  title: string;
  normalizedTitle?: string;
  locationKeys?: string[];
  season?: string | null;
  year?: number | null;
  postingDate?: Date | null;
};

function tokenize(value: string): string[] {
  return uniqueStrings(canonicalizeText(value).split(" "));
}

function similarity(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;

  return union === 0 ? 0 : intersection / union;
}

export function computeDedupeFingerprint(input: DedupeFingerprintInput): string {
  const locationKey = uniqueStrings(input.locationKeys ?? []).sort()[0] ?? "unknown-location";
  const season = (input.season?.toUpperCase() as InternshipSeasonValue | undefined) ?? "UNKNOWN";
  const year = input.year ?? 0;

  return [
    canonicalizeText(input.companyName),
    normalizeTitle(input.title),
    locationKey,
    season,
    year.toString()
  ].join("::");
}

export function isPotentialDuplicate(left: DuplicateCandidate, right: DuplicateCandidate): boolean {
  if (canonicalizeText(left.companyName) !== canonicalizeText(right.companyName)) {
    return false;
  }

  const titleSimilarity = similarity(
    left.normalizedTitle ?? normalizeTitle(left.title),
    right.normalizedTitle ?? normalizeTitle(right.title)
  );

  if (titleSimilarity < 0.72) {
    return false;
  }

  const leftLocations = uniqueStrings(left.locationKeys ?? []);
  const rightLocations = uniqueStrings(right.locationKeys ?? []);
  const locationCompatible =
    leftLocations.length === 0 ||
    rightLocations.length === 0 ||
    leftLocations.some((location) => rightLocations.includes(location));

  if (!locationCompatible) {
    return false;
  }

  if (left.year && right.year && left.year !== right.year) {
    return false;
  }

  if (left.season && right.season && left.season !== right.season) {
    return false;
  }

  if (left.postingDate && right.postingDate) {
    const distance = Math.abs(left.postingDate.getTime() - right.postingDate.getTime());
    const days = distance / (1000 * 60 * 60 * 24);

    if (days > 45) {
      return false;
    }
  }

  return true;
}

