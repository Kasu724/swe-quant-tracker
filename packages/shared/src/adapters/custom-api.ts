import { decodeHtmlEntities, normalizeWhitespace, stripHtml, uniqueStrings } from "../normalization/text";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { fetchJson, fetchText, type SourceAdapter } from "./base";

type CustomApiParserId =
  | "amazon-search-json"
  | "microsoft-pcsx-search"
  | "pcsx-search"
  | "github-jibe-jobs"
  | "jibe-jobs"
  | "salesforce-rss";

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

type MicrosoftSearchResponse = {
  data?: {
    count?: number;
    positions?: MicrosoftPositionSummary[];
  };
};

type MicrosoftPositionSummary = {
  id?: number | string;
  displayJobId?: string;
  name?: string;
  locations?: string[];
  standardizedLocations?: string[];
  postedTs?: number;
  department?: string;
  workLocationOption?: string | null;
  locationFlexibility?: string | null;
  atsJobId?: string;
  positionUrl?: string;
};

type MicrosoftPositionDetailResponse = {
  data?: MicrosoftPositionDetail;
};

type MicrosoftPositionDetail = MicrosoftPositionSummary & {
  jobDescription?: string;
  location?: string;
  publicUrl?: string;
  efcustomTextEmploymentType?: string[];
  efcustomTextCurrentProfession?: string[];
  efcustomTextTaDisciplineName?: string[];
  efcustomTextRoletype?: string[];
};

type JibeJobsResponse = {
  jobs?: JibeJobEnvelope[];
  count?: number;
  totalCount?: number;
};

type JibeJobEnvelope = {
  data?: JibeJobData;
};

type JibeJobData = {
  slug?: string;
  req_id?: string;
  title?: string;
  description?: string;
  location_name?: string;
  country?: string;
  country_code?: string;
  location_type?: string;
  categories?: Array<{ name?: string }>;
  tags2?: string[];
  tags3?: string[];
  tags4?: string[];
  tags5?: string[];
  tags6?: string[];
  tags7?: string[];
  posted_date?: string;
  apply_url?: string;
  update_date?: string;
  create_date?: string;
  full_location?: string;
  short_location?: string;
  multipleLocations?: Array<string | { location?: string; name?: string; full_location?: string }> | boolean;
  meta_data?: {
    canonical_url?: string;
  } & Record<string, unknown>;
  category?: string;
};

type SalesforceRssJob = {
  title?: string;
  date?: string;
  requisitionid?: string;
  referencenumber?: string;
  apijobid?: string;
  url?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  postalcode?: string;
  description?: string;
  jobtype?: string;
  category?: string;
  sourcename?: string;
  remotetype?: string;
  lastactivitydate?: string;
};

function getParserId(context: AdapterFetchContext): CustomApiParserId {
  const parserId = context.source.parserConfigJson?.parserId;

  if (
    parserId === "amazon-search-json" ||
    parserId === "microsoft-pcsx-search" ||
    parserId === "pcsx-search" ||
    parserId === "github-jibe-jobs" ||
    parserId === "jibe-jobs" ||
    parserId === "salesforce-rss"
  ) {
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

function getBooleanConfig(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return fallback;
}

function getStringConfig(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
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

function buildMicrosoftSearchUrl(sourceUrl: string, start: number): string {
  const url = new URL(sourceUrl);

  url.searchParams.set("start", String(start));

  if (!url.searchParams.has("domain")) {
    url.searchParams.set("domain", "microsoft.com");
  }

  if (!url.searchParams.has("location")) {
    url.searchParams.set("location", "");
  }

  return url.toString();
}

function buildMicrosoftDetailUrl(sourceUrl: string, positionId: string): string {
  const url = new URL(sourceUrl);

  return new URL(
    `/api/pcsx/position_details?position_id=${encodeURIComponent(positionId)}&domain=${
      url.searchParams.get("domain") ?? "microsoft.com"
    }`,
    url.origin
  ).toString();
}

function extractMicrosoftPayRaw(descriptionHtml?: string): string | undefined {
  if (!descriptionHtml) {
    return undefined;
  }

  const match = descriptionHtml.match(
    /<p>\s*[^<]*base pay range[^<]*(?:USD|GBP|EUR|CAD|\$|£|€)[^<]*<\/p>/i
  );

  return match ? normalizeWhitespace(match[0].replace(/<\/?p>/gi, "")) : undefined;
}

function normalizeMicrosoftPosting(
  detail: MicrosoftPositionDetail,
  searchUrl: string
): AdapterFetchedPosting | undefined {
  const sourceUrl =
    detail.publicUrl ??
    (detail.positionUrl
      ? new URL(detail.positionUrl, new URL(searchUrl).origin).toString()
      : undefined);
  const externalJobId = detail.atsJobId ?? detail.displayJobId ?? String(detail.id ?? "");
  const locationList = uniqueStrings(detail.standardizedLocations ?? detail.locations ?? []);
  const locationRaw = normalizeWhitespace(detail.location || locationList[0] || "");
  const additionalLocations = locationList.slice(1);
  const title = normalizeWhitespace(detail.name || "");

  if (!sourceUrl || !externalJobId || !title) {
    return undefined;
  }

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate: typeof detail.postedTs === "number" ? new Date(detail.postedTs * 1_000) : undefined,
    descriptionHtml: detail.jobDescription || undefined,
    locationRaw: locationRaw || undefined,
    additionalLocations,
    remoteTypeHint: detail.workLocationOption ?? detail.locationFlexibility ?? undefined,
    payRaw: extractMicrosoftPayRaw(detail.jobDescription),
    metadata: {
      department: detail.department,
      employmentType: detail.efcustomTextEmploymentType,
      profession: detail.efcustomTextCurrentProfession,
      discipline: detail.efcustomTextTaDisciplineName,
      roleType: detail.efcustomTextRoletype
    },
    raw: detail
  };
}

async function fetchMicrosoftPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const pageSize = getNumericConfig(context.source.requestConfigJson?.pageSize, 10);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 15);
  const fetchDetails = getBooleanConfig(context.source.requestConfigJson?.fetchDetails, false);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let start = 0;
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < maxPages && start < total) {
    const response = await fetchJson<MicrosoftSearchResponse>(
      context,
      buildMicrosoftSearchUrl(context.source.sourceUrl, start)
    );
    const positions = response.data?.positions ?? [];

    total = typeof response.data?.count === "number" ? response.data.count : total;

    if (positions.length === 0) {
      break;
    }

    for (const position of positions) {
      const positionId = position.id !== undefined && position.id !== null ? String(position.id) : undefined;

      if (!positionId) {
        continue;
      }

      let detailedPosition: MicrosoftPositionDetail | undefined;

      if (fetchDetails) {
        try {
          const detailResponse = await fetchJson<MicrosoftPositionDetailResponse>(
            context,
            buildMicrosoftDetailUrl(context.source.sourceUrl, positionId)
          );

          detailedPosition = detailResponse.data;
        } catch {
          detailedPosition = undefined;
        }
      }

      const posting = normalizeMicrosoftPosting(
        {
        ...position,
        ...detailedPosition
        },
        context.source.sourceUrl
      );

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (positions.length < pageSize) {
      break;
    }

    start += positions.length;
    page += 1;
  }

  return postings;
}

function buildJibeJobsUrl(sourceUrl: string, page: number, context: AdapterFetchContext): string {
  const url = new URL(sourceUrl);

  url.searchParams.set("page", String(page));
  const query = getStringConfig(context.source.requestConfigJson?.query).trim();
  const queryParamName = getStringConfig(context.source.requestConfigJson?.queryParamName, "query");

  if (query) {
    url.searchParams.set(queryParamName, query);
  }

  return url.toString();
}

function extractJibeAdditionalLocations(
  raw: JibeJobData["multipleLocations"],
  primaryLocation?: string
): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return uniqueStrings(
    raw
      .map((location) => {
        if (typeof location === "string") {
          return normalizeWhitespace(location);
        }

        return normalizeWhitespace(
          location.full_location ?? location.location ?? location.name ?? ""
        );
      })
      .filter((location) => Boolean(location) && location !== primaryLocation)
  );
}

function getJibeDescription(job: JibeJobData): {
  descriptionHtml?: string;
  descriptionText?: string;
} {
  const description = job.description;

  if (!description) {
    return {};
  }

  if (/<[a-z][\s\S]*>/i.test(description)) {
    return {
      descriptionHtml: description,
      descriptionText: stripHtml(description)
    };
  }

  return {
    descriptionText: normalizeWhitespace(description)
  };
}

function extractJibePayRaw(descriptionHtml?: string, descriptionText?: string): string | undefined {
  const text = descriptionText || (descriptionHtml ? stripHtml(descriptionHtml) : "");

  if (!text) {
    return undefined;
  }

  const sentences = text.split(/(?<=[.?!])\s+/);

  return sentences.find(
    (sentence) =>
      /\b(compensation range|salary range|base salary range|base pay range|hourly rate|salary)\b/i.test(
        sentence
      ) && /(?:USD|GBP|EUR|CAD|\$|£|€)/i.test(sentence)
  );
}

function normalizeJibePosting(job: JibeJobData): AdapterFetchedPosting | undefined {
  const title = normalizeWhitespace(job.title || "");
  const sourceUrl =
    getStringConfig(job.meta_data?.canonical_url) ||
    (job.slug ? `https://www.github.careers/job/${job.slug}` : "");
  const applicationUrl = normalizeWhitespace(job.apply_url || sourceUrl);
  const externalJobId = normalizeWhitespace(job.req_id || job.slug || "");
  const locationRaw = normalizeWhitespace(
    job.full_location || job.location_name || job.short_location || ""
  );
  const additionalLocations = extractJibeAdditionalLocations(job.multipleLocations, locationRaw);
  const { descriptionHtml, descriptionText } = getJibeDescription(job);

  if (!title || !sourceUrl || !applicationUrl || !externalJobId) {
    return undefined;
  }

  return {
    externalJobId,
    title,
    applicationUrl,
    sourceUrl,
    postingDate: job.posted_date || job.update_date || job.create_date,
    descriptionHtml,
    descriptionText,
    locationRaw: locationRaw || undefined,
    additionalLocations,
    remoteTypeHint:
      /remote/i.test(locationRaw) || job.location_type === "ANY" ? "Remote" : undefined,
    payRaw: extractJibePayRaw(descriptionHtml, descriptionText),
    metadata: {
      category: job.category,
      categories: job.categories?.map((entry) => entry.name).filter(Boolean),
      country: job.country,
      countryCode: job.country_code,
      locationType: job.location_type,
      tags: uniqueStrings([
        ...(job.tags2 ?? []),
        ...(job.tags3 ?? []),
        ...(job.tags4 ?? []),
        ...(job.tags5 ?? []),
        ...(job.tags6 ?? []),
        ...(job.tags7 ?? [])
      ])
    },
    raw: job
  };
}

async function fetchJibePostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 10);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;
  let fetchedCount = 0;

  while (page <= maxPages && fetchedCount < totalCount) {
    const response = await fetchJson<JibeJobsResponse>(
      context,
      buildJibeJobsUrl(context.source.sourceUrl, page, context)
    );
    const jobs = response.jobs ?? [];

    totalCount =
      typeof response.totalCount === "number"
        ? response.totalCount
        : typeof response.count === "number"
          ? response.count
          : totalCount;

    if (jobs.length === 0) {
      break;
    }

    for (const envelope of jobs) {
      if (!envelope.data) {
        continue;
      }

      const posting = normalizeJibePosting(envelope.data);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    fetchedCount += jobs.length;
    page += 1;
  }

  return postings;
}

function decodeRssField(value?: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return decodeHtmlEntities(value.trim());
}

function extractRssField(block: string, field: string): string | undefined {
  const cdataPattern = new RegExp(`<${field}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${field}>`, "i");
  const cdataMatch = block.match(cdataPattern);

  if (cdataMatch?.[1] !== undefined) {
    return decodeRssField(cdataMatch[1]);
  }

  const plainPattern = new RegExp(`<${field}>([\\s\\S]*?)<\\/${field}>`, "i");
  const plainMatch = block.match(plainPattern);

  return plainMatch?.[1] !== undefined ? decodeRssField(plainMatch[1]) : undefined;
}

function parseSalesforceRss(xml: string): SalesforceRssJob[] {
  const jobs: SalesforceRssJob[] = [];

  for (const match of xml.matchAll(/<job>([\s\S]*?)<\/job>/gi)) {
    const block = match[1];

    jobs.push({
      title: extractRssField(block, "title"),
      date: extractRssField(block, "date"),
      requisitionid: extractRssField(block, "requisitionid"),
      referencenumber: extractRssField(block, "referencenumber"),
      apijobid: extractRssField(block, "apijobid"),
      url: extractRssField(block, "url"),
      company: extractRssField(block, "company"),
      city: extractRssField(block, "city"),
      state: extractRssField(block, "state"),
      country: extractRssField(block, "country"),
      postalcode: extractRssField(block, "postalcode"),
      description: extractRssField(block, "description"),
      jobtype: extractRssField(block, "jobtype"),
      category: extractRssField(block, "category"),
      sourcename: extractRssField(block, "sourcename"),
      remotetype: extractRssField(block, "remotetype"),
      lastactivitydate: extractRssField(block, "lastactivitydate")
    });
  }

  return jobs;
}

function normalizeSalesforceRssPosting(job: SalesforceRssJob): AdapterFetchedPosting | undefined {
  const title = normalizeWhitespace(job.title || "");
  const sourceUrl = normalizeWhitespace(job.url || "");
  const externalJobId = normalizeWhitespace(
    job.requisitionid || job.referencenumber || job.apijobid || sourceUrl
  );
  const locationRaw = normalizeWhitespace(
    uniqueStrings([job.city, job.state, job.country]).join(", ")
  );

  if (!title || !sourceUrl || !externalJobId) {
    return undefined;
  }

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate: job.date || job.lastactivitydate,
    descriptionHtml: job.description || undefined,
    descriptionText: job.description ? stripHtml(job.description) : undefined,
    employmentType: job.jobtype || undefined,
    locationRaw: locationRaw || undefined,
    remoteTypeHint: job.remotetype || undefined,
    metadata: {
      category: job.category,
      companyName: job.company,
      sourceName: job.sourcename,
      postalCode: job.postalcode
    },
    raw: job
  };
}

async function fetchSalesforceRssPostings(
  context: AdapterFetchContext
): Promise<AdapterFetchedPosting[]> {
  const xml = await fetchText(context, context.source.sourceUrl);

  return parseSalesforceRss(xml)
    .map((job) => normalizeSalesforceRssPosting(job))
    .filter((posting): posting is AdapterFetchedPosting => Boolean(posting));
}

export class CustomApiAdapter implements SourceAdapter {
  readonly type = "CUSTOM_API" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    switch (getParserId(context)) {
      case "amazon-search-json":
        return fetchAmazonPostings(context);
      case "github-jibe-jobs":
      case "jibe-jobs":
        return fetchJibePostings(context);
      case "microsoft-pcsx-search":
      case "pcsx-search":
        return fetchMicrosoftPostings(context);
      case "salesforce-rss":
        return fetchSalesforceRssPostings(context);
      default:
        return [];
    }
  }
}
