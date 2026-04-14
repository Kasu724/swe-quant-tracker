import { describe, expect, it } from "vitest";
import { detectRemoteType, extractLocationCountries, normalizeLocations } from "../src/normalization/location";

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
});
