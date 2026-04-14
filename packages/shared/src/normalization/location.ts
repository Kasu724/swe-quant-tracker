import { COUNTRY_CODE_BY_NAME, US_STATE_NAME_BY_CODE } from "../constants/domain";
import type { NormalizedLocation, RemoteTypeValue } from "../types";
import { canonicalizeText, slugify, uniqueStrings } from "./text";

const US_STATE_CODE_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);

function inferCountryCode(value: string): string | undefined {
  const key = canonicalizeText(value);

  return COUNTRY_CODE_BY_NAME[key];
}

function inferRegion(part: string): { region?: string; regionCode?: string; countryCode?: string } {
  const trimmed = part.trim();
  const regionCode = trimmed.toUpperCase();

  if (US_STATE_NAME_BY_CODE[regionCode]) {
    return {
      region: US_STATE_NAME_BY_CODE[regionCode],
      regionCode,
      countryCode: "US"
    };
  }

  const stateCode = US_STATE_CODE_BY_NAME[trimmed.toLowerCase()];

  if (stateCode) {
    return {
      region: US_STATE_NAME_BY_CODE[stateCode],
      regionCode: stateCode,
      countryCode: "US"
    };
  }

  const countryCode = inferCountryCode(trimmed);

  if (countryCode) {
    return {
      region: trimmed,
      countryCode
    };
  }

  return {
    region: trimmed
  };
}

export function detectRemoteType(...values: Array<string | null | undefined>): RemoteTypeValue {
  const combined = canonicalizeText(values.filter(Boolean).join(" "));

  if (/\bhybrid\b/.test(combined)) {
    return "HYBRID";
  }
  if (/\bremote\b/.test(combined) || /\bwork from home\b/.test(combined)) {
    return "REMOTE";
  }
  if (/\bonsite\b/.test(combined) || /\bin office\b/.test(combined)) {
    return "ONSITE";
  }

  return "UNKNOWN";
}

function normalizeSingleLocation(value: string): NormalizedLocation | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const lowered = canonicalizeText(trimmed);
  const remote = detectRemoteType(trimmed);
  const remoteOnly = lowered === "remote" || lowered === "hybrid" || lowered === "onsite";

  if (remoteOnly) {
    return {
      raw: trimmed,
      display: trimmed,
      key: slugify(trimmed),
      isRemote: remote === "REMOTE",
      isUs: false
    };
  }

  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  const [cityPart, regionPart, countryPart] = parts;
  const region = inferRegion(countryPart ? regionPart : regionPart ?? "");
  const countryCode = countryPart
    ? inferCountryCode(countryPart) ?? region.countryCode
    : region.countryCode ?? inferCountryCode(regionPart ?? "");
  const country =
    countryPart ?? (countryCode === "US" ? "United States" : region.countryCode ? region.region : undefined);

  if (parts.length === 1) {
    const singlePartCountryCode = countryCode ?? inferCountryCode(trimmed);

    return {
      raw: trimmed,
      display: trimmed,
      key: slugify(trimmed),
      countryCode: singlePartCountryCode,
      country:
        singlePartCountryCode === "US"
          ? "United States"
          : singlePartCountryCode
            ? trimmed
            : country,
      isRemote: remote === "REMOTE",
      isUs: singlePartCountryCode === "US"
    };
  }

  return {
    raw: trimmed,
    display: trimmed,
    key: slugify([cityPart, region.region, country].filter(Boolean).join(" ")),
    city: cityPart,
    region: region.region,
    regionCode: region.regionCode,
    country,
    countryCode,
    isRemote: remote === "REMOTE",
    isUs: countryCode === "US"
  };
}

export function normalizeLocations(values: Array<string | null | undefined>): NormalizedLocation[] {
  const normalized = values
    .flatMap((value) => (value ? value.split(/\s+\|\s+|\s*;\s*|\s+\/\s+/) : []))
    .map((value) => normalizeSingleLocation(value))
    .filter((value): value is NormalizedLocation => Boolean(value));

  const seen = new Set<string>();

  return normalized.filter((location) => {
    if (seen.has(location.key)) {
      return false;
    }

    seen.add(location.key);
    return true;
  });
}

export function extractLocationCountries(locations: NormalizedLocation[]): string[] {
  return uniqueStrings(locations.map((location) => location.countryCode));
}
