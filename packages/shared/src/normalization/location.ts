import { COUNTRY_CODE_BY_NAME, US_STATE_NAME_BY_CODE } from "../constants/domain";
import type { NormalizedLocation, RemoteTypeValue } from "../types";
import { canonicalizeText, slugify, uniqueStrings } from "./text";

const US_STATE_CODE_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);

const EMBEDDED_COUNTRY_ALIASES = new Set(["u s", "u s a", "us", "usa", "uk", "uae"]);

const COUNTRY_METADATA_KEYS = new Set([
  "careercountries",
  "countries",
  "country",
  "countrycode",
  "countrycodes",
  "normalizedcountrycode",
  "normalizedcountryname"
]);

const COUNTRY_CODE_BY_KNOWN_NON_US_CITY: Record<string, string> = {
  "abu dhabi": "AE",
  amsterdam: "NL",
  ankara: "TR",
  bangalore: "IN",
  barcelona: "ES",
  beijing: "CN",
  bengaluru: "IN",
  berlin: "DE",
  bogota: "CO",
  brisbane: "AU",
  "cape town": "ZA",
  chennai: "IN",
  dublin: "IE",
  dubai: "AE",
  gurgaon: "IN",
  gurugram: "IN",
  hamburg: "DE",
  "hong kong": "HK",
  hyderabad: "IN",
  istanbul: "TR",
  johannesburg: "ZA",
  "kuala lumpur": "MY",
  lisbon: "PT",
  london: "GB",
  madrid: "ES",
  manama: "BH",
  melbourne: "AU",
  "mexico city": "MX",
  montreal: "CA",
  mumbai: "IN",
  munich: "DE",
  noida: "IN",
  osaka: "JP",
  ottawa: "CA",
  paris: "FR",
  prague: "CZ",
  pune: "IN",
  "rio de janeiro": "BR",
  santiago: "CL",
  "sao paulo": "BR",
  seoul: "KR",
  shanghai: "CN",
  shenzhen: "CN",
  singapore: "SG",
  stockholm: "SE",
  sydney: "AU",
  taipei: "TW",
  "tel aviv": "IL",
  tokyo: "JP",
  toronto: "CA",
  vancouver: "CA",
  warsaw: "PL",
  zurich: "CH"
};

function normalizeMetadataKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferCountryCode(value: string): string | undefined {
  const key = canonicalizeText(value);

  return COUNTRY_CODE_BY_NAME[key];
}

function inferCountryCodesFromText(value: string): string[] {
  const key = canonicalizeText(value);
  const exact = COUNTRY_CODE_BY_NAME[key];

  if (exact) {
    return [exact];
  }

  const countryMatches = uniqueStrings(
    Object.entries(COUNTRY_CODE_BY_NAME)
      .filter(([name]) => {
        const looksLikeAlias = /^[a-z](?:\s?[a-z]){1,2}$/.test(name);

        return EMBEDDED_COUNTRY_ALIASES.has(name) || !looksLikeAlias;
      })
      .filter(([name]) => new RegExp(`(?:^|\\s)${escapeRegex(name)}(?:\\s|$)`).test(key))
      .map(([, code]) => code)
  );

  if (countryMatches.length > 0) {
    return countryMatches;
  }

  return uniqueStrings(
    Object.entries(COUNTRY_CODE_BY_KNOWN_NON_US_CITY)
      .filter(([city]) => new RegExp(`(?:^|\\s)${escapeRegex(city)}(?:\\s|$)`).test(key))
      .map(([, code]) => code)
  );
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
    ? inferCountryCode(countryPart) ?? inferCountryCodesFromText(countryPart)[0] ?? region.countryCode
    : region.countryCode ?? inferCountryCode(regionPart ?? "") ?? inferCountryCodesFromText(trimmed)[0];
  const country =
    countryPart ?? (countryCode === "US" ? "United States" : region.countryCode ? region.region : undefined);

  if (parts.length === 1) {
    const singlePartCountryCode = countryCode ?? inferCountryCodesFromText(trimmed)[0];

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

function collectMetadataCountryStrings(value: unknown, output: string[], key?: string) {
  if (typeof value === "string") {
    if (key && COUNTRY_METADATA_KEYS.has(normalizeMetadataKey(key))) {
      output.push(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectMetadataCountryStrings(entry, output, key);
    }

    return;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (
      typeof record.name === "string" &&
      COUNTRY_METADATA_KEYS.has(normalizeMetadataKey(record.name)) &&
      "value" in record
    ) {
      collectMetadataCountryStrings(record.value, output, record.name);
    }

    for (const [entryKey, entryValue] of Object.entries(record)) {
      collectMetadataCountryStrings(entryValue, output, entryKey);
    }
  }
}

export function extractLocationCountries(
  locations: NormalizedLocation[],
  metadata?: Record<string, unknown> | null
): string[] {
  const metadataCountryValues: string[] = [];

  if (metadata) {
    collectMetadataCountryStrings(metadata, metadataCountryValues);
  }

  return uniqueStrings([
    ...locations.map((location) => location.countryCode),
    ...locations.flatMap((location) => inferCountryCodesFromText(location.raw)),
    ...metadataCountryValues.flatMap((value) => inferCountryCodesFromText(value))
  ]);
}

export function isUsOrUnknownPostingLocation(
  countryCodes: string[],
  ...rawLocations: Array<string | null | undefined>
): boolean {
  const knownCountryCodes = uniqueStrings([
    ...countryCodes.filter(Boolean),
    ...rawLocations.flatMap((location) => (location ? inferCountryCodesFromText(location) : []))
  ]);

  return knownCountryCodes.length === 0 || knownCountryCodes.every((code) => code === "US");
}
