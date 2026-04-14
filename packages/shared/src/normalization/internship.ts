import { INTERNSHIP_EXCLUDE_PATTERNS, INTERNSHIP_INCLUDE_PATTERNS } from "../constants/domain";
import { canonicalizeText } from "./text";

function hasIncludeSignal(text: string): boolean {
  return INTERNSHIP_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasExcludeSignal(text: string): boolean {
  return INTERNSHIP_EXCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isInternshipPosting(title: string, description?: string | null): boolean {
  const titleText = canonicalizeText(title);
  const bodyText = canonicalizeText(description ?? "");
  const combined = `${titleText} ${bodyText}`;

  if (/\bnew grad(uate)?\b/i.test(combined) && !hasIncludeSignal(combined)) {
    return false;
  }

  if (hasIncludeSignal(titleText)) {
    return true;
  }

  if (!hasIncludeSignal(combined)) {
    return false;
  }

  return !hasExcludeSignal(titleText);
}

