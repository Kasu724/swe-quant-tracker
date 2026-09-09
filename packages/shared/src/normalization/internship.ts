import {
  INTERNSHIP_BODY_INCLUDE_PATTERNS,
  INTERNSHIP_HARD_EXCLUDE_PATTERNS,
  INTERNSHIP_SOFT_EXCLUDE_PATTERNS,
  INTERNSHIP_TITLE_INCLUDE_PATTERNS
} from "../constants/domain";
import { canonicalizeText } from "./text";

const STRUCTURED_INCLUDE_PATTERNS = [
  ...INTERNSHIP_TITLE_INCLUDE_PATTERNS,
  /\bemployment type internship\b/i,
  /\bjob type internship\b/i,
  /\bposition type internship\b/i,
  /\bworker subtype internship\b/i
] as const;

const BODY_STRONG_INCLUDE_PATTERNS = [
  /\bthis (?:\d{1,2} week )?intern(ship)?\b/i,
  /\bthis (?:role|position|opportunity) is an? intern(ship)?\b/i,
  /\bjoin us as an? intern\b/i,
  /\bas an? intern\b/i,
  /\b(?:10|11|12|13|14|15|16) week internship\b/i,
  /\bsummer internship\b/i,
  /\bfall internship\b/i,
  /\bwinter internship\b/i,
  /\bspring internship\b/i,
  /\boff cycle internship\b/i,
  /\bco op position\b/i,
  /\bworking student position\b/i,
  /\bstudent worker position\b/i,
  /\bstudent technician position\b/i,
  /\bstudent researcher position\b/i,
  /\bapprenticeship\b/i
] as const;

const BODY_FALSE_POSITIVE_PATTERNS = [
  /\bprevious internship experience\b/i,
  /\bprior internship experience\b/i,
  /\bpast internship experience\b/i,
  /\bfull time (?:role|position|job)\b/i,
  /\bnew grad(uate)?\b/i,
  /\bearly career\b/i,
  /\breturnship\b/i,
  /\bimmediate(?:ly)?\b/i,
  /\b(?:manage|run|support|build|coordinate|lead|own)\b.{0,60}\binternship program(?:s)?\b/i,
  /\bcampus recruiting\b/i
] as const;

// New graduate classification is intentionally conservative.  A degree or
// graduation date in an experienced requisition is not enough; the posting
// must identify the role as entry level, a graduate program, or a campus hire.
const NEW_GRAD_TITLE_INCLUDE_PATTERNS = [
  /\bnew grad(?:uate)?\b/i,
  /\brecent grad(?:uate)?\b/i,
  /\bearly career\b/i,
  /\bentry[- ]level\b/i,
  /\buniversity grad(?:uate)?\b/i,
  /\bgraduate (?:software|data|machine learning|quant|technology|engineering|engineer|trader|trading|researcher|developer|analyst)\b/i,
  /\b(?:software|data|machine learning|quant|technology|engineering|engineer|trader|trading|researcher|developer|analyst)\s+(?:[-–]\s*)?graduate\b/i,
  /\bgraduate program\b/i,
  /\bcampus hire\b/i
] as const;

const NEW_GRAD_BODY_INCLUDE_PATTERNS = [
  /\b(?:open|welcoming|welcome) to (?:new|recent) graduates?\b/i,
  /\bfor (?:new|recent) graduates?\b/i,
  /\bnew graduate program\b/i,
  /\bentry[- ]level (?:role|position|opportunity)\b/i,
  /\bdesigned for (?:new|recent) graduates?\b/i,
  /\b(?:campus|university) hire(?:s|ing)?\b/i
] as const;

const NEW_GRAD_HARD_EXCLUDE_PATTERNS = [
  /\b(?:senior|staff|principal|lead|director|head|vp|vice president)\b/i,
  /\bexperienced (?:professional|engineer|researcher|candidate)s?\b/i
] as const;

const NEW_GRAD_BODY_EXPERIENCE_EXCLUDE_PATTERNS = [
  /\b(?:[5-9]|[1-9]\d)\+? years? (?:of )?experience\b/i,
  /\b(?:minimum|required|at least)\s+(?:[3-9]|[1-9]\d)\+? years?\b/i
] as const;

const NEW_GRAD_STRUCTURED_INCLUDE_PATTERNS = [
  /\bnew graduate\b/i,
  /\bentry[- ]level\b/i,
  /\bearly career\b/i,
  /\bgraduate program\b/i,
  /\bcampus hire\b/i,
  /\buniversity graduate\b/i
] as const;

const STRUCTURED_METADATA_INCLUDE_KEYS = new Set([
  "careercategories",
  "careerlevel",
  "categories",
  "category",
  "commitment",
  "department",
  "discipline",
  "employmenttype",
  "experiencelevel",
  "jobcategory",
  "jobfamily",
  "jobkeywords",
  "primarysearchlabel",
  "profession",
  "roletype",
  "searchlabels",
  "tags",
  "team",
  "timetype",
  "workersubtype"
]);

function normalizeMetadataKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasTitleIncludeSignal(text: string): boolean {
  return INTERNSHIP_TITLE_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasStructuredIncludeSignal(text: string): boolean {
  return STRUCTURED_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
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

function hasStrongBodyIncludeSignal(text: string): boolean {
  return BODY_STRONG_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasBodyFalsePositiveSignal(text: string): boolean {
  return BODY_FALSE_POSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasNewGradTitleSignal(text: string): boolean {
  return NEW_GRAD_TITLE_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasNewGradBodySignal(text: string): boolean {
  return NEW_GRAD_BODY_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasNewGradStructuredSignal(text: string): boolean {
  return NEW_GRAD_STRUCTURED_INCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasNewGradHardExcludeSignal(text: string): boolean {
  return NEW_GRAD_HARD_EXCLUDE_PATTERNS.some((pattern) => pattern.test(text));
}

function collectAllStructuredStrings(value: unknown, output: string[]) {
  if (typeof value === "string") {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectAllStructuredStrings(entry, output);
    }

    return;
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectAllStructuredStrings(entry, output);
    }
  }
}

function collectStructuredMetadataStrings(value: unknown, output: string[], key?: string) {
  if (typeof value === "string") {
    if (key && STRUCTURED_METADATA_INCLUDE_KEYS.has(normalizeMetadataKey(key))) {
      output.push(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectStructuredMetadataStrings(entry, output, key);
    }

    return;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (
      typeof record.name === "string" &&
      STRUCTURED_METADATA_INCLUDE_KEYS.has(normalizeMetadataKey(record.name)) &&
      "value" in record
    ) {
      collectAllStructuredStrings(record.value, output);
    }

    for (const [entryKey, entryValue] of Object.entries(record)) {
      collectStructuredMetadataStrings(entryValue, output, entryKey);
    }
  }
}

export function isInternshipPosting(
  title: string,
  description?: string | null,
  options?: {
    employmentType?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): boolean {
  const titleText = canonicalizeText(title);
  const bodyText = canonicalizeText(description ?? "");
  const structuredParts: string[] = [];

  if (options?.employmentType) {
    structuredParts.push(options.employmentType);
  }

  if (options?.metadata) {
    collectStructuredMetadataStrings(options.metadata, structuredParts);
  }

  const structuredText = canonicalizeText(structuredParts.join(" "));

  if (hasHardExcludeSignal(titleText)) {
    return false;
  }

  if (hasTitleIncludeSignal(titleText)) {
    return true;
  }

  if (hasSoftExcludeSignal(titleText)) {
    return false;
  }

  if (hasStructuredIncludeSignal(structuredText)) {
    return true;
  }

  if (!hasBodyIncludeSignal(bodyText) || hasBodyFalsePositiveSignal(bodyText)) {
    return false;
  }

  return hasStrongBodyIncludeSignal(bodyText);
}

/**
 * Classify full-time graduate and entry-level roles independently from
 * internships.  Internship classification always wins in normalizePosting.
 */
export function isNewGradPosting(
  title: string,
  description?: string | null,
  options?: {
    employmentType?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): boolean {
  const titleText = canonicalizeText(title);
  const bodyText = canonicalizeText(description ?? "");
  const structuredParts: string[] = [];

  if (options?.employmentType) {
    structuredParts.push(options.employmentType);
  }

  if (options?.metadata) {
    collectStructuredMetadataStrings(options.metadata, structuredParts);
  }

  const structuredText = canonicalizeText(structuredParts.join(" "));

  if (
    hasNewGradHardExcludeSignal(titleText) ||
    hasNewGradHardExcludeSignal(structuredText) ||
    NEW_GRAD_BODY_EXPERIENCE_EXCLUDE_PATTERNS.some((pattern) => pattern.test(bodyText))
  ) {
    return false;
  }

  return (
    hasNewGradTitleSignal(titleText) ||
    hasNewGradBodySignal(bodyText) ||
    hasNewGradStructuredSignal(structuredText)
  );
}
