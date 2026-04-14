import { normalizeWhitespace, uniqueStrings } from "../normalization/text";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { fetchJson, type SourceAdapter } from "./base";

type CustomApiParserId = "amazon-search-json";

type AmazonSearchResponse = {
  hits?: number;
  jobs?: AmazonJob[];
};

type AmazonJob = {
  id?: string;
  id_icims?: string | number;
  title?: string;
  posted_date?: string;
  updated_time?: string;
  job_path?: string;
  url_next_step?: string;
  description?: string;
  description_short?: string;
  basic_qualifications?: string;
  preferred_qualifications?: string;
  location?: string;
  locations?: Array<string | AmazonLocationRecord>;
  normalized_location?: string;
  city?: string;
  state?: string;
  country_code?: string;
  company_name?: string;
  business_category?: string;
  job_category?: string;
  job_family?: string;
  job_schedule_type?: string;
  primary_search_label?: string;
  optional_search_labels?: string[];
  source_system?: string;
  university_job?: boolean | null;
  team?: {
    label?: string | null;
    identifier?: string | null;
  } | null;
};

type AmazonLocationRecord = {
  city?: string;
  normalizedCityName?: string;
  normalizedStateName?: string;
  normalizedCountryName?: string;
  normalizedCountryCode?: string;
  countryIso2a?: string;
  countryIso3a?: string;
  normalizedLocation?: string;
  location?: string;
  region?: string;
  type?: string;
};

function getParserId(context: AdapterFetchContext): CustomApiParserId {
  const parserId = context.source.parserConfigJson?.parserId;

  if (parserId === "amazon-search-json") {
    return parserId;
  }

  throw new Error(`Unsupported CUSTOM_API parserId: ${String(parserId ?? "undefined")}`);
}

function getNumericConfig(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseAmazonLocation(input: string | AmazonLocationRecord): AmazonLocationRecord | undefined {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as AmazonLocationRecord;

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      return undefined;
    }
  }

  if (input && typeof input === "object") {
    return input;
  }

  return undefined;
}

function formatAmazonLocation(location: AmazonLocationRecord): string | undefined {
  const city = location.city ?? location.normalizedCityName;
  const region = location.normalizedStateName ?? location.region;
  const country = location.normalizedCountryName;
  const display = normalizeWhitespace(uniqueStrings([city, region, country]).join(", "));

  return display || location.normalizedLocation || location.location || undefined;
}

function buildAmazonSearchUrl(sourceUrl: string, offset: number, pageSize: number): string {
  const url = new URL(sourceUrl);

  url.searchParams.set("offset", String(offset));
  url.searchParams.set("result_limit", String(pageSize));

  if (!url.searchParams.has("sort")) {
    url.searchParams.set("sort", "recent");
  }

  if (!url.searchParams.has("base_query")) {
    url.searchParams.set("base_query", "");
  }

  if (!url.searchParams.has("loc_query")) {
    url.searchParams.set("loc_query", "");
  }

  if (!url.searchParams.has("is_intern[]")) {
    url.searchParams.append("is_intern[]", "1");
  }

  return url.toString();
}

function buildAmazonDescriptionHtml(job: AmazonJob): string | undefined {
  const sections = [
    job.description,
    job.basic_qualifications
      ? `<h2>Basic qualifications</h2><div>${job.basic_qualifications}</div>`
      : undefined,
    job.preferred_qualifications
      ? `<h2>Preferred qualifications</h2><div>${job.preferred_qualifications}</div>`
      : undefined
  ].filter((section): section is string => Boolean(section));

  return sections.length > 0 ? sections.join("<br/><br/>") : undefined;
}

function normalizeAmazonPosting(job: AmazonJob): AdapterFetchedPosting | undefined {
  const sourceUrl = job.job_path ? new URL(job.job_path, "https://www.amazon.jobs").toString() : undefined;
  const externalJobId =
    job.id_icims !== undefined && job.id_icims !== null
      ? String(job.id_icims)
      : job.id || sourceUrl;

  if (!externalJobId || !job.title || !sourceUrl) {
    return undefined;
  }

  const parsedLocations = (job.locations ?? [])
    .map((location) => parseAmazonLocation(location))
    .filter((location): location is AmazonLocationRecord => Boolean(location));
  const formattedLocations = uniqueStrings(
    parsedLocations
      .map((location) => formatAmazonLocation(location))
      .filter((location): location is string => Boolean(location))
  );
  const fallbackLocation = normalizeWhitespace(
    job.normalized_location || job.location || uniqueStrings([job.city, job.state, job.country_code]).join(", ")
  );
  const locationRaw = formattedLocations[0] ?? (fallbackLocation || undefined);
  const additionalLocations = formattedLocations.slice(1);
  const remoteTypeHints = uniqueStrings(parsedLocations.map((location) => location.type));

  return {
    externalJobId,
    title: normalizeWhitespace(job.title),
    applicationUrl: job.url_next_step || sourceUrl,
    sourceUrl,
    postingDate: job.posted_date,
    descriptionHtml: buildAmazonDescriptionHtml(job),
    descriptionText: job.description_short || undefined,
    employmentType: job.job_schedule_type || undefined,
    locationRaw,
    additionalLocations,
    remoteTypeHint: remoteTypeHints[0] || undefined,
    metadata: {
      businessCategory: job.business_category,
      companyName: job.company_name,
      countryCode: job.country_code,
      jobCategory: job.job_category,
      jobFamily: job.job_family,
      primarySearchLabel: job.primary_search_label,
      searchLabels: job.optional_search_labels,
      sourceSystem: job.source_system,
      team: job.team?.label ?? job.team?.identifier,
      universityJob: job.university_job,
      updatedTime: job.updated_time
    },
    raw: job
  };
}

async function fetchAmazonPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 100), 100);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 10);
  const postings: AdapterFetchedPosting[] = [];
  let offset = 0;
  let page = 0;
  let hits = Number.POSITIVE_INFINITY;

  while (page < maxPages && offset < hits) {
    const response = await fetchJson<AmazonSearchResponse>(
      context,
      buildAmazonSearchUrl(context.source.sourceUrl, offset, pageSize)
    );
    const jobs = response.jobs ?? [];

    hits = typeof response.hits === "number" ? response.hits : hits;

    if (jobs.length === 0) {
      break;
    }

    const normalizedBatch = jobs
      .map((job) => normalizeAmazonPosting(job))
      .filter((posting): posting is AdapterFetchedPosting => Boolean(posting));

    postings.push(...normalizedBatch);

    if (jobs.length < pageSize) {
      break;
    }

    offset += jobs.length;
    page += 1;
  }

  return postings;
}

export class CustomApiAdapter implements SourceAdapter {
  readonly type = "CUSTOM_API" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    switch (getParserId(context)) {
      case "amazon-search-json":
        return fetchAmazonPostings(context);
      default:
        return [];
    }
  }
}
