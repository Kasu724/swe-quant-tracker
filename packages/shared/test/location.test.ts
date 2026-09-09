import { describe, expect, it } from "vitest";
import {
  detectRemoteType,
  extractLocationCountries,
  isUsOrUnknownPostingLocation,
  normalizeLocations
} from "../src/normalization/location";

describe("location normalization", () => {
  it("preserves non-Latin locations and recognizes accented country and city names", () => {
    expect(normalizeLocations(["東京", "大阪"])).toHaveLength(2);
    expect(normalizeLocations(["東京, Japan", "大阪, Japan"])).toHaveLength(2);
    expect(extractLocationCountries(normalizeLocations(["São Paulo"]))).toEqual(["BR"]);
    expect(extractLocationCountries(normalizeLocations(["Abidjan, Côte d’Ivoire"]))).toEqual(["CI"]);
  });
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
    expect(extractLocationCountries(normalizeLocations(["London"]), { countryCode: "CA" })).toEqual(["CA"]);
    const countries = extractLocationCountries(normalizeLocations(["Madrid"]), {
      countryCode: "ESP"
    });

    expect(countries).toEqual(["ES"]);
  });

  it("infers city-only locations across countries", () => {
    const cases = [
      ["San Francisco", "US", "United States"],
      ["Mountain View", "US", "United States"],
      ["Cupertino", "US", "United States"],
      ["Redmond", "US", "United States"],
      ["Munich", "DE", "Germany"],
      ["Reykjavik", "IS", "Iceland"],
      ["Nairobi", "KE", "Kenya"],
      ["Ho Chi Minh City", "VN", "Vietnam"],
      ["Zürich", "CH", "Switzerland"]
    ] as const;

    for (const [raw, countryCode, country] of cases) {
      const normalized = normalizeLocations([raw]);

      expect(normalized[0]?.countryCode, raw).toBe(countryCode);
      expect(normalized[0]?.country, raw).toBe(country);
      expect(normalized[0]?.display, raw).toContain(country);
      expect(extractLocationCountries(normalized), raw).toEqual([countryCode]);
    }

    expect(extractLocationCountries(normalizeLocations(["London, United States"]))).toEqual(["US"]);
  });

  it("uses structured metadata instead of an inferred city country", () => {
    expect(
      extractLocationCountries(normalizeLocations(["San Francisco"]), { countryCode: "CA" })
    ).toEqual(["CA"]);
  });

  it("uses population to resolve ambiguous city-only locations", () => {
    expect(normalizeLocations(["San Francisco"])[0]?.countryCode).toBe("US");
    expect(normalizeLocations(["London"])[0]?.countryCode).toBe("GB");
    expect(normalizeLocations(["Paris"])[0]?.countryCode).toBe("FR");
  });

  it("renders canonical city, region, and country names", () => {
    expect(normalizeLocations(["San Francisco"])[0]?.display).toBe("San Francisco, United States");
    expect(normalizeLocations(["san francisco, ca"])[0]?.display).toBe(
      "San Francisco, California, United States"
    );
    expect(normalizeLocations(["London, United Kingdom"])[0]?.display).toBe("London, United Kingdom");
    expect(normalizeLocations(["Hybrid - San Francisco"])[0]?.display).toBe(
      "San Francisco, United States"
    );
    expect(normalizeLocations(["San Francisco, CA • New York, NY"]).map((location) => location.display)).toEqual([
      "San Francisco, California, United States",
      "New York City, New York, United States"
    ]);
    expect(normalizeLocations(["San Francisco, Seattle, New York"]).map((location) => location.display)).toEqual([
      "San Francisco, United States",
      "Seattle, United States",
      "New York City, United States"
    ]);
    expect(normalizeLocations(["Bangalore"])[0]?.display).toBe("Bangalore, India");
    expect(normalizeLocations(["ES"])[0]?.display).toBe("Spain");
    expect(normalizeLocations(["Toronto, CA, Canada"])[0]?.display).toBe("Toronto, Canada");
    expect(normalizeLocations(["CA, United States"])[0]?.display).toBe(
      "California, United States"
    );
    expect(normalizeLocations(["Berlin, DE, Germany"])[0]?.display).toBe("Berlin, Germany");
    expect(normalizeLocations(["AU-Sydney"])[0]?.display).toBe("Sydney, Australia");
    expect(normalizeLocations(["US-WA-Bellevue"])[0]?.display).toBe(
      "Bellevue, Washington, United States"
    );
    expect(normalizeLocations(["Beijing OR Shanghai"]).map((location) => location.display)).toEqual([
      "Beijing, China",
      "Shanghai, China"
    ]);
    expect(normalizeLocations(["China, Beijing, China"])[0]?.display).toBe("Beijing, China");
    expect(normalizeLocations(["India, Bangalore, India"])[0]?.display).toBe("Bangalore, India");
  });

  it("keeps unknown place names country-neutral", () => {
    const location = normalizeLocations(["Invented Place That Does Not Exist"])[0];

    expect(location?.countryCode).toBeUndefined();
    expect(location?.display).toBe("Unknown location");
    expect(location?.isUnknown).toBe(true);
    expect(extractLocationCountries(location ? [location] : [])).toEqual([]);
  });

  it("labels remote-only postings without a country as unknown", () => {
    const location = normalizeLocations(["Remote"])[0];

    expect(location?.display).toBe("Unknown location");
    expect(location?.isUnknown).toBe(true);
  });

  it("recognizes country alpha-2 codes outside the legacy alias set", () => {
    expect(normalizeLocations(["Hanoi, VN"])[0]?.countryCode).toBe("VN");
    expect(normalizeLocations(["Lagos, NG"])[0]?.countryCode).toBe("NG");
    expect(
      extractLocationCountries(normalizeLocations(["Auckland"]), { countryCode: "NZ" })
    ).toContain("NZ");
  });

  it("uses structured state or province regions before city aliases", () => {
    expect(normalizeLocations(["Paris, TX"])[0]?.countryCode).toBe("US");
    expect(normalizeLocations(["London, ON"])[0]?.countryCode).toBe("CA");
    expect(normalizeLocations(["Vancouver, BC"])[0]?.countryCode).toBe("CA");
    expect(extractLocationCountries(normalizeLocations(["Paris, TX"]))).toEqual(["US"]);
  });

  it("disambiguates two-letter region codes with the city context", () => {
    expect(normalizeLocations(["Berlin, DE"])[0]?.countryCode).toBe("DE");
    expect(normalizeLocations(["Pune, IN"])[0]?.countryCode).toBe("IN");
    expect(normalizeLocations(["Toronto, CA"])[0]?.countryCode).toBe("CA");
    expect(normalizeLocations(["San Francisco, CA"])[0]?.countryCode).toBe("US");
    expect(normalizeLocations(["Portland, OR"])[0]?.countryCode).toBe("US");
    expect(normalizeLocations(["Germany, Berlin"])[0]?.countryCode).toBe("DE");
    expect(normalizeLocations(["Berlin, DE, United States"])[0]?.countryCode).toBe("US");
    expect(normalizeLocations(["Georgia"])[0]?.countryCode).toBe("US");
    expect(normalizeLocations(["IN"])[0]?.countryCode).toBe("IN");
  });

  it("allows US and unknown locations but rejects known non-US locations", () => {
    expect(isUsOrUnknownPostingLocation(["US"])).toBe(true);
    expect(isUsOrUnknownPostingLocation([])).toBe(true);
    expect(isUsOrUnknownPostingLocation([], "Remote - United States")).toBe(true);
    expect(isUsOrUnknownPostingLocation([], "Remote - Canada")).toBe(false);
    expect(isUsOrUnknownPostingLocation([], "San Francisco")).toBe(true);
    expect(isUsOrUnknownPostingLocation([], "Paris, TX")).toBe(true);
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
