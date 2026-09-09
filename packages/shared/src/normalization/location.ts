import cities from "all-the-cities";
import { COUNTRY_CODE_BY_NAME, COUNTRY_OPTIONS, US_STATE_NAME_BY_CODE } from "../constants/domain";
import type { NormalizedLocation, RemoteTypeValue } from "../types";
import { canonicalizeSearchText as canonicalizeText, slugify as asciiSlugify, uniqueStrings } from "./text";

function slugify(value: string): string {
  const searchKey = canonicalizeText(value).replace(/\s+/g, "-");
  return /[^\x00-\x7f]/.test(searchKey) ? searchKey : asciiSlugify(value) || searchKey;
}

const US_STATE_CODE_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);

const CANADA_PROVINCE_NAME_BY_CODE: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon"
};

const CANADA_PROVINCE_CODE_BY_NAME = Object.fromEntries(
  Object.entries(CANADA_PROVINCE_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);

const COUNTRY_NAME_BY_CODE = Object.fromEntries(
  COUNTRY_OPTIONS.map(({ code, name }) => [code, name])
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

// Preserve common ATS aliases that differ from the gazetteer's canonical
// place names. Exact gazetteer matching handles the general case below.
const COUNTRY_CODE_BY_CITY_ALIAS: Record<string, string> = {
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

type CityMatch = (typeof cities)[number];

const CITY_MATCHES_BY_NAME = new Map<string, CityMatch[]>();

for (const city of cities) {
  for (const name of uniqueStrings([city.name, city.altName])) {
    const key = canonicalizeText(name);

    if (!key) {
      continue;
    }

    const matches = CITY_MATCHES_BY_NAME.get(key) ?? [];
    matches.push(city);
    CITY_MATCHES_BY_NAME.set(key, matches);
  }
}

function cityMatches(value: string): CityMatch[] {
  return CITY_MATCHES_BY_NAME.get(canonicalizeText(value)) ?? [];
}

function cityMatchesWithSuffix(value: string): CityMatch[] {
  const directMatches = cityMatches(value);

  if (directMatches.length > 0) {
    return directMatches;
  }

  const baseName = value.split(/\s+[-–—]\s+/)[0]?.trim();
  const baseMatches = baseName && baseName !== value ? cityMatches(baseName) : [];

  if (baseMatches.length > 0) {
    return baseMatches;
  }

  return cityMatches(`${baseName ?? value} City`);
}

function canonicalCityNameFromText(value: string): string | undefined {
  const words = value.split(/\s+/).filter(Boolean);

  for (let length = words.length; length > 0; length -= 1) {
    const candidate = words.slice(0, length).join(" ");
    const match = cityMatchesWithSuffix(candidate)[0];

    if (match) {
      return match.name;
    }
  }

  return undefined;
}

function bestCityMatch(value: string, regionPart?: string, countryCode?: string): CityMatch | undefined {
  const matches = cityMatchesWithSuffix(value);

  if (matches.length === 0) {
    return undefined;
  }

  const normalizedRegion = canonicalizeText(regionPart ?? "");
  const regionCode = regionPart?.trim().toUpperCase();
  const requestedCountry = countryCode ?? inferCountryCode(regionPart ?? "");
  const matchingRegion = normalizedRegion
    ? matches.filter(
        (city) =>
          city.adminCode.toUpperCase() === regionCode ||
          canonicalizeText(US_STATE_NAME_BY_CODE[city.adminCode] ?? "") === normalizedRegion ||
          canonicalizeText(CANADA_PROVINCE_NAME_BY_CODE[city.adminCode] ?? "") === normalizedRegion
      )
    : [];
  const matchingCountry = requestedCountry
    ? matches.filter((city) => city.country === requestedCountry)
    : [];
  const candidates = matchingRegion.length > 0
    ? matchingRegion
    : matchingCountry.length > 0
      ? matchingCountry
      : matches;

  return candidates.reduce((best, candidate) =>
    candidate.population > best.population ? candidate : best
  );
}

function inferCountryCodeFromCity(value: string, regionPart?: string): string | undefined {
  return COUNTRY_CODE_BY_CITY_ALIAS[canonicalizeText(value)] ?? bestCityMatch(value, regionPart)?.country;
}

function cityMatchForLocation(
  value: string | undefined,
  regionPart: string | undefined,
  countryCode: string | undefined
): CityMatch | undefined {
  if (!value) {
    return undefined;
  }

  const preferredCountry = countryCode ?? COUNTRY_CODE_BY_CITY_ALIAS[canonicalizeText(value)];
  return bestCityMatch(value, regionPart, preferredCountry);
}

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

  const aliasedCityMatches = uniqueStrings(
    Object.entries(COUNTRY_CODE_BY_CITY_ALIAS)
      .filter(([city]) => new RegExp(`(?:^|\\s)${escapeRegex(city)}(?:\\s|$)`).test(key))
      .map(([, code]) => code)
  );

  if (aliasedCityMatches.length > 0) {
    return aliasedCityMatches;
  }

  const cityMatch = bestCityMatch(value);

  return cityMatch ? [cityMatch.country] : [];
}

function inferRegion(
  part: string,
  cityPart?: string
): { region?: string; regionCode?: string; countryCode?: string } {
  const trimmed = part.trim();
  const regionCode = trimmed.toUpperCase();

  // A two-letter region can be both a US state and a country-specific region
  // code. Prefer a known international city when the city disambiguates it:
  // Berlin, DE; Pune, IN; and Toronto, CA are common ATS formats.
  const cityCountryCode = cityPart ? inferCountryCodeFromCity(cityPart, trimmed) : undefined;

  if (
    cityCountryCode &&
    cityCountryCode === regionCode &&
    cityCountryCode !== "US" &&
    US_STATE_NAME_BY_CODE[regionCode]
  ) {
    return {
      region: trimmed,
      regionCode,
      countryCode: cityCountryCode
    };
  }

  if (US_STATE_NAME_BY_CODE[regionCode]) {
    return {
      region: US_STATE_NAME_BY_CODE[regionCode],
      regionCode,
      countryCode: "US"
    };
  }

  if (CANADA_PROVINCE_NAME_BY_CODE[regionCode]) {
    return {
      region: CANADA_PROVINCE_NAME_BY_CODE[regionCode],
      regionCode,
      countryCode: "CA"
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

  const provinceCode = CANADA_PROVINCE_CODE_BY_NAME[trimmed.toLowerCase()];

  if (provinceCode) {
    return {
      region: CANADA_PROVINCE_NAME_BY_CODE[provinceCode],
      regionCode: provinceCode,
      countryCode: "CA"
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

function canonicalRegionForCountry(
  value: string | undefined,
  countryCode: string | undefined
): { name: string; code: string } | undefined {
  if (!value || !countryCode) {
    return undefined;
  }

  const trimmed = value.trim();
  const code = trimmed.toUpperCase();

  if (countryCode === "US") {
    if (US_STATE_NAME_BY_CODE[code]) {
      return { name: US_STATE_NAME_BY_CODE[code], code };
    }

    const stateCode = US_STATE_CODE_BY_NAME[trimmed.toLowerCase()];
    if (stateCode) {
      return { name: US_STATE_NAME_BY_CODE[stateCode], code: stateCode };
    }
  }

  if (countryCode === "CA") {
    if (CANADA_PROVINCE_NAME_BY_CODE[code]) {
      return { name: CANADA_PROVINCE_NAME_BY_CODE[code], code };
    }

    const provinceCode = CANADA_PROVINCE_CODE_BY_NAME[trimmed.toLowerCase()];
    if (provinceCode) {
      return { name: CANADA_PROVINCE_NAME_BY_CODE[provinceCode], code: provinceCode };
    }
  }

  return undefined;
}

function parseCountryPrefixedLocation(value: string): string | undefined {
  const segments = value.split(/\s*[-:]\s*/).map((segment) => segment.trim()).filter(Boolean);

  if (segments.length < 2) {
    return undefined;
  }

  let countryIndex = -1;
  let countryCode: string | undefined;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const candidate = inferCountryCode(segments[index] ?? "");
    if (candidate) {
      countryIndex = index;
      countryCode = candidate;
      break;
    }
  }

  if (countryIndex < 0 || !countryCode) {
    return undefined;
  }

  const remainder = segments.slice(countryIndex + 1).join(" ").trim();
  if (!remainder || /^(all locations|all offices|multiple locations?)$/i.test(remainder)) {
    return COUNTRY_NAME_BY_CODE[countryCode];
  }

  const remainderParts = remainder.split(/\s+/).filter(Boolean);
  const regionToken = remainderParts[0];
  const region = canonicalRegionForCountry(regionToken, countryCode);
  const cityValue = region ? remainderParts.slice(1).join(" ") : remainder;
  const city = canonicalCityNameFromText(cityValue) ?? cityValue.split(/\s+-\s+/)[0]?.trim();

  if (!city) {
    return COUNTRY_NAME_BY_CODE[countryCode];
  }

  return [city, region?.name, COUNTRY_NAME_BY_CODE[countryCode]].filter(Boolean).join(", ");
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

  const remotePrefixMatch = trimmed.match(/^(remote|hybrid|onsite)\s*(?:[-:,]\s*)/i);
  const remotePrefix = remotePrefixMatch?.[1]
    ? remotePrefixMatch[1][0].toUpperCase() + remotePrefixMatch[1].slice(1).toLowerCase()
    : undefined;
  const locationValue = remotePrefix
    ? trimmed.slice(remotePrefixMatch?.[0].length ?? 0).replace(/^(remote|hybrid|onsite)\s*(?:[-:,]\s*)/i, "").trim()
    : trimmed;
  const parsedLocationValue = parseCountryPrefixedLocation(locationValue);
  const canonicalInput = parsedLocationValue ?? locationValue;
  const lowered = canonicalizeText(canonicalInput);
  const remote = detectRemoteType(trimmed);
  const remoteOnly = lowered === "remote" || lowered === "hybrid" || lowered === "onsite";

  if (remoteOnly) {
    return {
      raw: trimmed,
      display: "Unknown location",
      key: slugify(trimmed),
      isUnknown: true,
      isRemote: remote === "REMOTE",
      isUs: false
    };
  }

  const parts = canonicalInput.split(",").map((part) => part.trim()).filter(Boolean);
  const [cityPart, regionPart, countryPart] = parts;
  const region = inferRegion(parts.length === 1 ? trimmed : regionPart ?? "", cityPart);
  const directSinglePartCountryCode =
    parts.length === 1 && /^[a-z]{2,3}$/i.test(trimmed) ? inferCountryCode(trimmed) : undefined;
  const countryCode = countryPart
    ? inferCountryCode(countryPart) ??
      inferCountryCodesFromText(countryPart)[0] ??
      region.countryCode ??
      inferCountryCodeFromCity(cityPart, regionPart)
    : directSinglePartCountryCode ??
      region.countryCode ??
      inferCountryCode(regionPart ?? "") ??
      inferCountryCodesFromText(trimmed)[0] ??
      inferCountryCodeFromCity(cityPart, regionPart);
  const country = countryCode ? COUNTRY_NAME_BY_CODE[countryCode] : undefined;
  const regionOnly = canonicalRegionForCountry(cityPart, countryCode);
  const secondPartIsCountry = inferCountryCode(regionPart ?? "") === countryCode;

  if (parts.length === 2 && regionOnly && secondPartIsCountry && countryCode && country) {
    return {
      raw: trimmed,
      display: `${regionOnly.name}, ${country}`,
      key: slugify(`${regionOnly.name} ${country}`),
      region: regionOnly.name,
      regionCode: regionOnly.code,
      country,
      countryCode,
      isUnknown: false,
      isRemote: remote === "REMOTE",
      isUs: countryCode === "US"
    };
  }

  if (parts.length === 1) {
    const explicitCountryCode = inferCountryCode(canonicalInput);
    const cityCountryCode = inferCountryCodeFromCity(canonicalInput);
    const singlePartCountryCode = countryCode ?? inferCountryCodesFromText(trimmed)[0] ?? cityCountryCode;
    const cityMatch = cityMatchForLocation(canonicalInput, undefined, singlePartCountryCode);
    const locationDisplay = explicitCountryCode
      ? COUNTRY_NAME_BY_CODE[singlePartCountryCode ?? ""] ?? canonicalInput
      : [cityMatch?.name ?? canonicalInput, COUNTRY_NAME_BY_CODE[singlePartCountryCode ?? ""]]
          .filter(Boolean)
          .join(", ");
    const display = singlePartCountryCode ? locationDisplay : "Unknown location";

    return {
      raw: trimmed,
      display,
      key: slugify(trimmed),
      countryCode: singlePartCountryCode,
      countryInferred: Boolean(cityCountryCode) && !explicitCountryCode,
      country: singlePartCountryCode ? COUNTRY_NAME_BY_CODE[singlePartCountryCode] : country,
      isUnknown: !singlePartCountryCode,
      isRemote: remote === "REMOTE",
      isUs: singlePartCountryCode === "US"
    };
  }

  const cityMatch = cityMatchForLocation(cityPart, regionPart, countryCode);
  const canonicalCity = cityMatch?.name ?? cityPart;
  const regionIsCountryToken = Boolean(
    region.regionCode &&
      region.regionCode === countryCode &&
      inferCountryCode(region.region ?? "") === countryCode
  );
  const canonicalRegion = regionIsCountryToken
    ? undefined
    : region.regionCode || !region.countryCode
      ? region.region
      : undefined;
  const locationDisplay = [canonicalCity, canonicalRegion, country].filter(Boolean).join(", ");
  const display = countryCode ? locationDisplay || locationValue : "Unknown location";

  return {
    raw: trimmed,
    display,
    key: slugify([cityPart, region.region, country].filter(Boolean).join(" ")),
    city: cityPart,
    region: regionIsCountryToken ? undefined : region.region,
    regionCode: regionIsCountryToken ? undefined : region.regionCode,
    country,
    countryCode,
    isUnknown: !countryCode,
    isRemote: remote === "REMOTE",
    isUs: countryCode === "US"
  };
}

export function normalizeLocations(values: Array<string | null | undefined>): NormalizedLocation[] {
  const normalized = values
    .flatMap((value) => {
      if (!value) {
        return [];
      }

      const separators = value.split(/\s+\|\s+|\s*;\s*|\s+\/\s+|\s*•\s*/);
      return separators.flatMap((part) =>
        part.includes(",") ? [part] : part.split(/\s+\bOR\b\s+/i)
      );
    })
    .flatMap((value) => {
      const commaParts = value.split(",").map((part) => part.trim()).filter(Boolean);

      return commaParts.length > 2 && commaParts.every((part) => cityMatchesWithSuffix(part).length > 0)
        ? commaParts
        : [value];
    })
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

  const metadataCountries = uniqueStrings(metadataCountryValues.flatMap((value) => inferCountryCodesFromText(value)));
  return uniqueStrings([
    ...locations.filter((location) => !location.countryInferred || metadataCountries.length === 0)
      .map((location) => location.countryCode),
    // A structured country or region takes precedence over city-name aliases.
    // For example, Paris, TX is US even though Paris is also a French city.
    ...locations
      .filter((location) => !location.countryCode)
      .flatMap((location) => inferCountryCodesFromText(location.raw)),
    ...metadataCountries
  ]);
}

export function isUsOrUnknownPostingLocation(
  countryCodes: string[],
  ...rawLocations: Array<string | null | undefined>
): boolean {
  const knownCountryCodes = uniqueStrings([
    ...countryCodes.filter(Boolean),
    ...rawLocations.flatMap((location) =>
      location
        ? normalizeLocations([location])
            .map((normalized) => normalized.countryCode)
            .filter((countryCode): countryCode is string => Boolean(countryCode))
        : []
    )
  ]);

  return knownCountryCodes.length === 0 || knownCountryCodes.includes("US");
}
