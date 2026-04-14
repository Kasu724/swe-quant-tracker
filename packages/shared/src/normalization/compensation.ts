import type { CompensationIntervalValue, ParsedCompensation } from "../types";
import { normalizeWhitespace } from "./text";

const INTERVAL_PATTERNS: Array<[CompensationIntervalValue, RegExp[]]> = [
  ["HOUR", [/\bper hour\b/i, /\bhourly\b/i, /\/\s*hr\b/i, /\/\s*hour\b/i]],
  ["YEAR", [/\bper year\b/i, /\byearly\b/i, /\bannually\b/i, /\bannual\b/i, /\/\s*yr\b/i, /\bsalary\b/i]],
  ["MONTH", [/\bper month\b/i, /\/\s*mo\b/i]],
  ["WEEK", [/\bper week\b/i, /\/\s*wk\b/i]],
  ["DAY", [/\bper day\b/i, /\/\s*day\b/i]]
];

function inferCurrency(raw: string): string | undefined {
  if (/\$|USD/i.test(raw)) {
    return "USD";
  }
  if (/£|GBP/i.test(raw)) {
    return "GBP";
  }
  if (/€|EUR/i.test(raw)) {
    return "EUR";
  }
  if (/CAD/i.test(raw)) {
    return "CAD";
  }

  return undefined;
}

export function normalizeCompensationInterval(value?: string | null): CompensationIntervalValue {
  const text = normalizeWhitespace((value ?? "").toLowerCase());

  for (const [interval, patterns] of INTERVAL_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return interval;
    }
  }

  if (text.includes("1 year") || text.includes("per-year")) {
    return "YEAR";
  }
  if (text.includes("1 hour") || text.includes("per-hour")) {
    return "HOUR";
  }

  return "UNKNOWN";
}

function coerceNumericAmount(value: string, suffix?: string): number {
  const numeric = Number(value.replace(/,/g, ""));

  if (suffix?.toLowerCase() === "k") {
    return numeric * 1_000;
  }
  if (suffix?.toLowerCase() === "m") {
    return numeric * 1_000_000;
  }

  return numeric;
}

export function parseCompensation(raw?: string | null): ParsedCompensation {
  if (!raw) {
    return { raw: undefined, known: false };
  }

  const normalized = normalizeWhitespace(raw.replace(/[–—]/g, "-"));
  const interval = normalizeCompensationInterval(normalized);
  const currency = inferCurrency(normalized);
  const amountMatches = Array.from(
    normalized.matchAll(/(?:USD|GBP|EUR|CAD|\$|£|€)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)([kKmM])?/g)
  )
    .map((match) => coerceNumericAmount(match[1], match[2]))
    .filter((value) => value >= 10)
    .filter((value) => !(value >= 2020 && value <= 2100 && !currency));

  if (amountMatches.length === 0) {
    return {
      raw: normalized,
      currency,
      interval,
      known: false
    };
  }

  const [first, second] = amountMatches;
  const fromOnly = /\bfrom\b|\bstarting at\b|\bminimum\b/i.test(normalized);
  const upToOnly = /\bup to\b|\bmaximum\b/i.test(normalized);

  return {
    raw: normalized,
    min: upToOnly ? undefined : first,
    max: fromOnly ? undefined : second ?? first,
    currency,
    interval,
    known: true
  };
}

