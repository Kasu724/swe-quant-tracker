import {
  INTERNSHIP_BODY_INCLUDE_PATTERNS,
  INTERNSHIP_HARD_EXCLUDE_PATTERNS,
  INTERNSHIP_SOFT_EXCLUDE_PATTERNS,
  INTERNSHIP_TITLE_INCLUDE_PATTERNS
} from "../constants/domain";
import { canonicalizeText } from "./text";

function hasTitleIncludeSignal(text: string): boolean {
  return INTERNSHIP_TITLE_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasBodyIncludeSignal(text: string): boolean {
  return INTERNSHIP_BODY_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasHardExcludeSignal(text: string): boolean {
  return INTERNSHIP_HARD_EXCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasSoftExcludeSignal(text: string): boolean {
  return INTERNSHIP_SOFT_EXCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isInternshipPosting(title: string, description?: string | null): boolean {
  const titleText = canonicalizeText(title);
  const bodyText = canonicalizeText(description ?? "");

  if (hasHardExcludeSignal(titleText)) {
    return false;
  }

  if (hasTitleIncludeSignal(titleText)) {
    return true;
  }

  if (hasSoftExcludeSignal(titleText)) {
    return false;
  }

  return hasBodyIncludeSignal(bodyText);
}
