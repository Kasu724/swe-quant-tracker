import { describe, expect, it } from "vitest";
import {
  detectRemoteType,
  extractLocationCountries,
  isUsOrUnknownPostingLocation,
  normalizeLocations
} from "../src/normalization/location";

describe("location normalization", () => {
  it("normalizes us city-state pairs", () => {
    const locations = normalizeLocations(["New York, NY"]);

    expect(locations[0]?.city).toBe("New York");
    expect(locations[0]?.countryCode).toBe("US");
  });

  it("extracts country codes", () => {
    const countries = extractLocationCountries(normalizeLocations(["London, United Kingdom", "Toronto, Canada"]));

    expect(countries).toContain("GB");
    expect(countries).toContain("CA");
  });

  it("normalizes common international country names and ISO3 codes", () => {
    const countries = extractLocationCountries(
      normalizeLocations([
        "Madrid, Community of Madrid, Spain",
        "Barcelona, Catalonia, ESP",
        "Singapore",
        "Dubai, United Arab Emirates",
        "Shanghai, 31, People's Republic of China",
        "Tel Aviv, Israel",
        "Cape Town, Western Cape, South Africa",
        "Seoul, South Korea"
      ])
    );

    expect(countries).toContain("ES");
    expect(countries).toContain("SG");
    expect(countries).toContain("AE");
    expect(countries).toContain("CN");
    expect(countries).toContain("IL");
    expect(countries).toContain("ZA");
    expect(countries).toContain("KR");
  });

  it("detects remote hints", () => {
    expect(detectRemoteType("Remote - United States")).toBe("REMOTE");
  });

  it("extracts embedded country names from remote locations", () => {
    expect(extractLocationCountries(normalizeLocations(["Remote - United States"]))).toEqual(["US"]);
    expect(extractLocationCountries(normalizeLocations(["US Remote"]))).toEqual(["US"]);
    expect(extractLocationCountries(normalizeLocations(["Remote - Canada"]))).toEqual(["CA"]);
  });

  it("uses structured country metadata when the display location is ambiguous", () => {
    const countries = extractLocationCountries(normalizeLocations(["Madrid"]), {
      countryCode: "ESP"
    });

    expect(countries).toEqual(["ES"]);
  });

  it("infers obvious non-US city-only locations", () => {
    expect(extractLocationCountries(normalizeLocations(["Munich"]))).toEqual(["DE"]);
    expect(extractLocationCountries(normalizeLocations(["London, United States"]))).toEqual(["US"]);
  });

  it("allows US and unknown locations but rejects known non-US locations", () => {
    expect(isUsOrUnknownPostingLocation(["US"])).toBe(true);
    expect(isUsOrUnknownPostingLocation([])).toBe(true);
    expect(isUsOrUnknownPostingLocation([], "Remote - United States")).toBe(true);
    expect(isUsOrUnknownPostingLocation([], "Remote - Canada")).toBe(false);
    expect(isUsOrUnknownPostingLocation(["US", "CA"])).toBe(true);
    expect(isUsOrUnknownPostingLocation(["GB"])).toBe(false);
  });

  it("keeps multi-country postings when the United States is one option", () => {
    expect(
      isUsOrUnknownPostingLocation(["CA", "US"], "Toronto, Canada | New York, United States")
    ).toBe(true);
    expect(isUsOrUnknownPostingLocation([], "Remote - Canada")).toBe(false);
  });
});
