import type { InternshipSeasonValue } from "../types";

const YEAR_PATTERN = /\b(20\d{2})\b/g;

function inferSeasonFromKeywords(text: string): InternshipSeasonValue | undefined {
  if (/\bspring\b/i.test(text)) {
    return "SPRING";
  }
  if (/\bsummer\b/i.test(text)) {
    return "SUMMER";
  }
  if (/\bfall\b|\bautumn\b/i.test(text)) {
    return "FALL";
  }
  if (/\bwinter\b/i.test(text)) {
    return "WINTER";
  }

  return undefined;
}

function inferDefaultSeason(postingDate?: Date | null): InternshipSeasonValue | undefined {
  if (!postingDate) {
    return undefined;
  }

  const month = postingDate.getUTCMonth();

  if (month >= 8) {
    return "SUMMER";
  }
  if (month >= 4) {
    return "FALL";
  }
  if (month >= 1) {
    return "SUMMER";
  }

  return "SPRING";
}

function inferDefaultYear(
  season: InternshipSeasonValue | undefined,
  postingDate?: Date | null
): number | undefined {
  if (!season || !postingDate) {
    return undefined;
  }

  const year = postingDate.getUTCFullYear();
  const month = postingDate.getUTCMonth();

  if (season === "SUMMER" && month >= 8) {
    return year + 1;
  }

  if (season === "SPRING" && month >= 10) {
    return year + 1;
  }

  return year;
}

export function inferSeasonYear(
  title: string,
  postingDate?: Date | string | null,
  description?: string | null
): { season?: InternshipSeasonValue; year?: number } {
  const postingDateValue =
    typeof postingDate === "string"
      ? new Date(postingDate)
      : postingDate ?? undefined;
  const validPostingDate =
    postingDateValue && Number.isFinite(postingDateValue.getTime())
      ? postingDateValue
      : undefined;
  const combined = `${title} ${description ?? ""}`;
  const season = inferSeasonFromKeywords(combined) ?? inferDefaultSeason(validPostingDate);
  const explicitYear = Array.from(combined.matchAll(YEAR_PATTERN))
    .map((match) => Number(match[1]))
    .find((year) => year >= 2020 && year <= 2100);

  return {
    season,
    year: explicitYear ?? inferDefaultYear(season, validPostingDate)
  };
}

