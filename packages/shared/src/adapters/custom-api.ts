import { decodeHtmlEntities, normalizeWhitespace, stripHtml, uniqueStrings } from "../normalization/text";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import {
  DEFAULT_DETAIL_CONCURRENCY,
  fetchJson,
  fetchJsonRequest,
  fetchText,
  mapWithConcurrency,
  type SourceAdapter
} from "./base";

type CustomApiParserId =
  | "amazon-search-json"
  | "eightfold-jobs"
  | "microsoft-pcsx-search"
  | "pcsx-search"
  | "github-jibe-jobs"
  | "jibe-jobs"
  | "generic-rss-items"
  | "ibm-careers-search"
  | "phenom-refine-search"
  | "salesforce-rss"
  | "meta-careers-search"
  | "oracle-hcm-search"
  | "smartrecruiters-postings"
  | "tiktok-search"
  | "uber-search";

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

type GenericRssItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  description?: string;
};

type IbmCareersSearchResponse = {
  resultset?: {
    searchresults?: {
      totalresults?: number | string;
      searchresultlist?: IbmCareersSearchResult[];
    };
  };
};

type IbmCareersSearchResult = {
  id?: string;
  title?: string;
  description?: string;
  url?: string;
  language?: string;
  docattributes?: Array<Record<string, unknown>>;
};

type MetaCareersResponse = {
  data?: {
    job_search_with_featured_jobs?: {
      all_jobs?: MetaCareersJob[];
    };
  };
};

type MetaCareersJob = {
  id?: string | number;
  title?: string;
  locations?: unknown[];
  teams?: unknown[];
  sub_teams?: unknown[];
  job_type?: string;
  job_category?: string;
};

type OracleHcmResponse = {
  items?: OracleHcmSearchItem[];
};

type OracleHcmSearchItem = {
  TotalJobsCount?: number;
  totalJobsCount?: number;
  requisitionList?: OracleHcmJob[];
};

type OracleHcmJob = {
  Id?: string | number;
  Title?: string;
  PostedDate?: string;
  PrimaryLocation?: string;
  PrimaryLocationCountry?: string;
  ShortDescriptionStr?: string;
  ExternalQualificationsStr?: string | null;
  ExternalResponsibilitiesStr?: string | null;
  WorkplaceType?: string | null;
  JobFamily?: string | null;
  JobFunction?: string | null;
  JobType?: string | null;
  WorkerType?: string | null;
  secondaryLocations?: Array<{ Name?: string; name?: string; LocationName?: string }>;
  otherWorkLocations?: Array<{ Name?: string; name?: string; LocationName?: string }>;
};

type SmartRecruitersSearchResponse = {
  content?: SmartRecruitersJob[];
  totalFound?: number;
};

type SmartRecruitersJob = {
  id?: string;
  uuid?: string;
  name?: string;
  refNumber?: string;
  releasedDate?: string;
  postingUrl?: string;
  applyUrl?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  department?: { label?: string; id?: string };
  typeOfEmployment?: { label?: string; id?: string };
  industry?: { label?: string; id?: string };
  jobAd?: {
    sections?: Record<string, { title?: string; text?: string }>;
  };
};

type TikTokSearchResponse = {
  data?: {
    job_post_list?: TikTokJob[];
    count?: number;
  };
};

type TikTokFiltersResponse = {
  data?: {
    city_list?: TikTokLocation[];
  };
};

type TikTokLocation = {
  code?: string;
  en_name?: string | null;
  i18n_name?: string | null;
  parent?: TikTokLocation | null;
  children?: TikTokLocation[];
};

type TikTokJob = {
  id?: string | number;
  code?: string;
  title?: string;
  description?: string;
  requirement?: string;
  recruit_type?: { id?: string | number; en_name?: string | null };
  job_category?: { id?: string | number; en_name?: string | null };
  job_subject?: { id?: string | number; en_name?: string | null };
  city_info?: TikTokLocation | null;
  department_info?: { id?: string | number; en_name?: string | null; name?: string | null };
  job_post_info?: {
    min_salary?: number | null;
    max_salary?: number | null;
    currency?: string | null;
    required_degree?: string | null;
    experience?: string | null;
  } | null;
};

type UberSearchResponse = {
  status?: string;
  data?: {
    results?: UberJob[];
    totalResults?: { low?: number; high?: number } | number;
  };
};

type UberLocation = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryName?: string | null;
};

type UberJob = {
  id?: string | number;
  title?: string;
  description?: string;
  department?: string;
  team?: string;
  type?: string;
  timeType?: string;
  creationDate?: string;
  updatedDate?: string;
  location?: UberLocation;
  allLocations?: UberLocation[];
  level?: string;
  programAndPlatform?: string;
};

type EightfoldJobsResponse = {
  positions?: EightfoldJob[];
  count?: number;
};

type EightfoldJob = {
  id?: string | number;
  name?: string;
  posting_name?: string;
  location?: string;
  locations?: string[];
  department?: string;
  business_unit?: string;
  t_update?: number;
  t_create?: number;
  ats_job_id?: string;
  display_job_id?: string;
  type?: string;
  job_description?: string;
  location_flexibility?: string | null;
  work_location_option?: string | null;
  canonicalPositionUrl?: string;
  isPrivate?: boolean;
};

type PhenomRefineSearchResponse = {
  refineSearch?: {
    status?: number;
    data?: {
      jobs?: PhenomJob[];
      totalHits?: number;
    };
  };
};

type PhenomJob = {
  jobId?: string | number;
  jobSeqNo?: string;
  reqId?: string | number;
  title?: string;
  type?: string;
  applyUrl?: string;
  postedDate?: string;
  dateCreated?: string;
  descriptionTeaser?: string;
  category?: string;
  category_raw?: string;
  department?: string;
  location?: string;
  cityStateCountry?: string;
  cityState?: string;
  city?: string;
  state?: string;
  country?: string;
  RemoteType?: string;
  multi_location?: string[];
  multi_location_array?: Array<{ location?: string }>;
  ml_job_parser?: {
    descriptionTeaser?: string;
    descriptionTeaser_ats?: string;
    descriptionTeaser_keyword?: string;
    descriptionTeaser_first200?: string;
  };
};

function getParserId(context: AdapterFetchContext): CustomApiParserId {
  const parserId = context.source.parserConfigJson?.parserId;

  if (
    parserId === "amazon-search-json" ||
    parserId === "eightfold-jobs" ||
    parserId === "microsoft-pcsx-search" ||
    parserId === "pcsx-search" ||
    parserId === "github-jibe-jobs" ||
    parserId === "jibe-jobs" ||
    parserId === "generic-rss-items" ||
    parserId === "ibm-careers-search" ||
    parserId === "phenom-refine-search" ||
    parserId === "salesforce-rss" ||
    parserId === "meta-careers-search" ||
    parserId === "oracle-hcm-search" ||
    parserId === "smartrecruiters-postings" ||
    parserId === "tiktok-search" ||
    parserId === "uber-search"
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

function getStringArrayConfig(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value
      .map((entry) => (typeof entry === "string" ? normalizeWhitespace(entry) : undefined))
      .filter((entry): entry is string => Boolean(entry))
  );
}

function asNormalizedString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeWhitespace(value) || undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function extractNamedValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value
      .map((entry) => {
        if (typeof entry === "string") {
          return normalizeWhitespace(entry);
        }

        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return undefined;
        }

        const record = entry as Record<string, unknown>;

        return asNormalizedString(
          record.name ?? record.title ?? record.label ?? record.displayName ?? record.localizedName
        );
      })
      .filter((entry): entry is string => Boolean(entry))
  );
}

function slugifyForUrl(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const detailConcurrency =
    context.source.requestConfigJson?.detailConcurrency ?? DEFAULT_DETAIL_CONCURRENCY;
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

    const pagePostings = await mapWithConcurrency(positions, detailConcurrency, async (position) => {
      const positionId = position.id !== undefined && position.id !== null ? String(position.id) : undefined;

      if (!positionId) {
        return undefined;
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

      return posting;
    });

    for (const posting of pagePostings) {
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

function buildJibeDetailUrl(context: AdapterFetchContext, job: JibeJobData): string {
  const canonicalUrl = getStringConfig(job.meta_data?.canonical_url);

  if (canonicalUrl) {
    return canonicalUrl;
  }

  const detailUrlBase = getStringConfig(context.source.requestConfigJson?.detailUrlBase);

  if (detailUrlBase && job.slug) {
    return new URL(encodeURIComponent(job.slug), detailUrlBase.endsWith("/") ? detailUrlBase : `${detailUrlBase}/`).toString();
  }

  return job.slug ? `https://www.github.careers/job/${job.slug}` : "";
}

function normalizeJibePosting(
  context: AdapterFetchContext,
  job: JibeJobData
): AdapterFetchedPosting | undefined {
  const title = normalizeWhitespace(job.title || "");
  const sourceUrl = buildJibeDetailUrl(context, job);
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

      const posting = normalizeJibePosting(context, envelope.data);

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

function parseGenericRssItems(xml: string): GenericRssItem[] {
  const items: GenericRssItem[] = [];

  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];

    items.push({
      title: extractRssField(block, "title"),
      link: extractRssField(block, "link"),
      guid: extractRssField(block, "guid"),
      pubDate: extractRssField(block, "pubDate"),
      description: extractRssField(block, "description")
    });
  }

  return items;
}

function splitGenericRssTitle(rawTitle: string): { title: string; locationRaw?: string } {
  const match = rawTitle.match(/^(?<title>[\s\S]*?)\s+\((?<location>[^()]*)\)\s*$/);

  if (!match?.groups?.title) {
    return { title: normalizeWhitespace(rawTitle) };
  }

  return {
    title: normalizeWhitespace(match.groups.title),
    locationRaw: normalizeWhitespace(match.groups.location || "") || undefined
  };
}

function normalizeGenericRssPosting(item: GenericRssItem): AdapterFetchedPosting | undefined {
  const rawTitle = normalizeWhitespace(item.title || "");
  const sourceUrl = normalizeWhitespace(item.link || "");
  const externalJobId = normalizeWhitespace(item.guid || sourceUrl);

  if (!rawTitle || !sourceUrl || !externalJobId) {
    return undefined;
  }

  const { title, locationRaw } = splitGenericRssTitle(rawTitle);

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate: item.pubDate,
    descriptionHtml: item.description || undefined,
    descriptionText: item.description ? stripHtml(item.description) : undefined,
    locationRaw,
    raw: item
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

async function fetchGenericRssPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const xml = await fetchText(context, context.source.sourceUrl);

  return parseGenericRssItems(xml)
    .map((item) => normalizeGenericRssPosting(item))
    .filter((posting): posting is AdapterFetchedPosting => Boolean(posting));
}

function buildIbmCareersSearchUrl(
  context: AdapterFetchContext,
  offset: number,
  pageSize: number,
  page: number
): string {
  const url = new URL(context.source.sourceUrl);
  const appId = getStringConfig(context.source.requestConfigJson?.appId, "careers");
  const query = getStringConfig(context.source.requestConfigJson?.query, "intern");
  const scope = getStringConfig(context.source.requestConfigJson?.scope, "careers2");
  const sortBy = getStringConfig(context.source.requestConfigJson?.sortBy, "-dcdate");

  url.searchParams.set("scope", scope);
  url.searchParams.set("rmdt", "ALL");
  url.searchParams.set("appid", appId);
  url.searchParams.set("sortby", sortBy);
  url.searchParams.set("fr", String(offset));
  url.searchParams.set("nr", String(pageSize));
  url.searchParams.set("page", String(page));
  url.searchParams.set("query", query);

  return url.toString();
}

function flattenIbmDocAttributes(attributes: IbmCareersSearchResult["docattributes"]): Record<string, unknown> {
  return (attributes ?? []).reduce<Record<string, unknown>>((accumulator, attribute) => {
    for (const [key, value] of Object.entries(attribute)) {
      accumulator[key.toLowerCase()] = value;
    }

    return accumulator;
  }, {});
}

function getIbmAttribute(attributes: Record<string, unknown>, key: string): string | undefined {
  return asNormalizedString(attributes[key.toLowerCase()]);
}

function getIbmJobId(job: IbmCareersSearchResult, attributes: Record<string, unknown>): string | undefined {
  const attributeId = getIbmAttribute(attributes, "field_text_01") ?? getIbmAttribute(attributes, "external_id");

  if (attributeId) {
    return attributeId;
  }

  const sourceUrl = normalizeWhitespace(job.url || getIbmAttribute(attributes, "url") || "");

  if (!sourceUrl) {
    return asNormalizedString(job.id);
  }

  const parsedUrl = new URL(sourceUrl);

  return parsedUrl.searchParams.get("jobId") ?? parsedUrl.searchParams.get("jobid") ?? asNormalizedString(job.id);
}

function buildIbmDetailUrl(
  context: AdapterFetchContext,
  job: IbmCareersSearchResult,
  attributes: Record<string, unknown>,
  externalJobId: string
): string {
  const detailBaseUrl = getStringConfig(
    context.source.requestConfigJson?.detailBaseUrl,
    "https://careers.ibm.com/en_US/careers/JobDetail"
  );
  const source = getStringConfig(context.source.requestConfigJson?.source, "WEB_Search_NA");
  const sourceUrl = normalizeWhitespace(job.url || getIbmAttribute(attributes, "url") || "");
  const url = new URL(detailBaseUrl || sourceUrl);

  url.searchParams.set("jobId", externalJobId);

  if (source && !url.searchParams.has("source")) {
    url.searchParams.set("source", source);
  }

  return url.toString();
}

function normalizeIbmCareersPosting(
  context: AdapterFetchContext,
  job: IbmCareersSearchResult
): AdapterFetchedPosting | undefined {
  const attributes = flattenIbmDocAttributes(job.docattributes);
  const title = normalizeWhitespace(job.title || getIbmAttribute(attributes, "title") || "");
  const externalJobId = getIbmJobId(job, attributes);

  if (!externalJobId || !title) {
    return undefined;
  }

  const sourceUrl = buildIbmDetailUrl(context, job, attributes, externalJobId);
  const locationRaw = normalizeWhitespace(
    uniqueStrings([
      getIbmAttribute(attributes, "field_keyword_19"),
      getIbmAttribute(attributes, "field_keyword_05")
    ]).join(", ")
  );
  const descriptionHtml = getIbmAttribute(attributes, "raw_body");
  const descriptionText = getIbmAttribute(attributes, "description") ?? job.description;

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate:
      getIbmAttribute(attributes, "dcdate") ?? getIbmAttribute(attributes, "effectivedate") ?? undefined,
    descriptionHtml,
    descriptionText,
    employmentType: getIbmAttribute(attributes, "field_keyword_18"),
    locationRaw: locationRaw || undefined,
    remoteTypeHint: getIbmAttribute(attributes, "field_keyword_17"),
    metadata: {
      country: getIbmAttribute(attributes, "country"),
      countryName: getIbmAttribute(attributes, "field_keyword_05"),
      experienceLevel: getIbmAttribute(attributes, "field_keyword_18"),
      language: job.language ?? getIbmAttribute(attributes, "language"),
      md5: getIbmAttribute(attributes, "md5"),
      processedTime: getIbmAttribute(attributes, "processedtime"),
      team: getIbmAttribute(attributes, "field_keyword_08")
    },
    raw: job
  };
}

async function fetchIbmCareersPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 50), 100);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 8);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (page <= maxPages && offset < total) {
    const response = await fetchJson<IbmCareersSearchResponse>(
      context,
      buildIbmCareersSearchUrl(context, offset, pageSize, page)
    );
    const searchResults = response.resultset?.searchresults;
    const jobs = searchResults?.searchresultlist ?? [];
    const parsedTotal = Number(searchResults?.totalresults);

    total = Number.isFinite(parsedTotal) ? parsedTotal : total;

    if (jobs.length === 0) {
      break;
    }

    for (const job of jobs) {
      const posting = normalizeIbmCareersPosting(context, job);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (jobs.length < pageSize) {
      break;
    }

    offset += jobs.length;
    page += 1;
  }

  return postings;
}

function normalizeMetaCareersPosting(
  job: MetaCareersJob,
  query: string
): AdapterFetchedPosting | undefined {
  const externalJobId = asNormalizedString(job.id);
  const title = normalizeWhitespace(job.title || "");

  if (!externalJobId || !title) {
    return undefined;
  }

  const locations = extractNamedValues(job.locations);
  const sourceUrl = `https://www.metacareers.com/jobs/${encodeURIComponent(externalJobId)}/`;

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    locationRaw: locations[0],
    additionalLocations: locations.slice(1),
    employmentType: job.job_type || job.job_category || undefined,
    metadata: {
      query,
      jobCategory: job.job_category,
      teams: extractNamedValues(job.teams),
      subTeams: extractNamedValues(job.sub_teams)
    },
    raw: job
  };
}

async function fetchMetaCareersPostings(
  context: AdapterFetchContext
): Promise<AdapterFetchedPosting[]> {
  const docId = getStringConfig(context.source.requestConfigJson?.docId, "26228555073499023");
  const configuredQueries = getStringArrayConfig(context.source.requestConfigJson?.queries);
  const fallbackQuery = getStringConfig(context.source.requestConfigJson?.query, "intern");
  const queries = configuredQueries.length > 0 ? configuredQueries : [fallbackQuery];
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const body = new URLSearchParams({
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "CareersJobSearchInputDropdownDataQuery",
      variables: JSON.stringify({
        search_input: {
          q: query,
          results_per_page: "FIVE"
        }
      }),
      server_timestamps: "true",
      doc_id: docId
    });
    const response = await fetchJsonRequest<MetaCareersResponse>(context, context.source.sourceUrl, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://www.metacareers.com",
        Referer: `https://www.metacareers.com/jobs/?q=${encodeURIComponent(query)}`,
        "x-fb-friendly-name": "CareersJobSearchInputDropdownDataQuery"
      }
    });
    const jobs = response.data?.job_search_with_featured_jobs?.all_jobs ?? [];

    for (const job of jobs) {
      const posting = normalizeMetaCareersPosting(job, query);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }
  }

  return postings;
}

function buildOracleFinder(context: AdapterFetchContext, offset: number, limit: number): string {
  const siteNumber = getStringConfig(context.source.requestConfigJson?.siteNumber, "CX_45001");
  const facetsList = getStringConfig(
    context.source.requestConfigJson?.facetsList,
    "LOCATIONS;TITLES;CATEGORIES;POSTING_DATES"
  );
  const searchText = getStringConfig(context.source.requestConfigJson?.searchText, "intern");
  const selectedLocationsFacet = getStringConfig(
    context.source.requestConfigJson?.selectedLocationsFacet,
    "300000000149325"
  );
  const parts = [
    `siteNumber=${siteNumber}`,
    `facetsList=${facetsList}`,
    `limit=${limit}`,
    `offset=${offset}`
  ];

  if (searchText) {
    parts.push(`keyword="${searchText.replace(/"/g, '\\"')}"`);
  }

  if (selectedLocationsFacet) {
    parts.push(`selectedLocationsFacet=${selectedLocationsFacet}`);
  }

  return `findReqs;${parts.join(",")}`;
}

function buildOracleSearchUrl(context: AdapterFetchContext, offset: number, limit: number): string {
  const url = new URL(context.source.sourceUrl);

  url.searchParams.set("onlyData", "true");
  if (!url.searchParams.has("expand")) {
    url.searchParams.set(
      "expand",
      "requisitionList.workLocation,requisitionList.otherWorkLocations,requisitionList.secondaryLocations,requisitionList.requisitionFlexFields"
    );
  }
  url.searchParams.set("finder", buildOracleFinder(context, offset, limit));

  return url.toString();
}

function buildOracleDescriptionHtml(job: OracleHcmJob): string | undefined {
  const sections = [
    job.ShortDescriptionStr ? `<p>${job.ShortDescriptionStr}</p>` : undefined,
    job.ExternalResponsibilitiesStr
      ? `<h2>Responsibilities</h2><div>${job.ExternalResponsibilitiesStr}</div>`
      : undefined,
    job.ExternalQualificationsStr
      ? `<h2>Qualifications</h2><div>${job.ExternalQualificationsStr}</div>`
      : undefined
  ].filter((section): section is string => Boolean(section));

  return sections.length > 0 ? sections.join("<br/><br/>") : undefined;
}

function extractOracleAdditionalLocations(job: OracleHcmJob, primary?: string): string[] {
  const values = [...(job.secondaryLocations ?? []), ...(job.otherWorkLocations ?? [])]
    .map((location) => location.Name ?? location.name ?? location.LocationName)
    .map((location) => (location ? normalizeWhitespace(location) : undefined))
    .filter((location): location is string => Boolean(location));

  return uniqueStrings(values).filter((location) => location !== primary);
}

function buildOracleDetailUrl(context: AdapterFetchContext, externalJobId: string): string {
  const detailBaseUrl = getStringConfig(
    context.source.requestConfigJson?.detailBaseUrl,
    "https://careers.oracle.com/en/sites/jobsearch/job"
  );

  return new URL(encodeURIComponent(externalJobId), detailBaseUrl.endsWith("/") ? detailBaseUrl : `${detailBaseUrl}/`).toString();
}

function normalizeOraclePosting(
  context: AdapterFetchContext,
  job: OracleHcmJob
): AdapterFetchedPosting | undefined {
  const externalJobId = asNormalizedString(job.Id);
  const title = normalizeWhitespace(job.Title || "");

  if (!externalJobId || !title) {
    return undefined;
  }

  const sourceUrl = buildOracleDetailUrl(context, externalJobId);
  const locationRaw =
    normalizeWhitespace(job.PrimaryLocation || "") ||
    (job.PrimaryLocationCountry ? normalizeWhitespace(job.PrimaryLocationCountry) : undefined);
  const descriptionHtml = buildOracleDescriptionHtml(job);

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate: job.PostedDate,
    descriptionHtml,
    descriptionText: descriptionHtml ? stripHtml(descriptionHtml) : undefined,
    employmentType: job.JobType || job.WorkerType || undefined,
    locationRaw,
    additionalLocations: extractOracleAdditionalLocations(job, locationRaw),
    remoteTypeHint: job.WorkplaceType || undefined,
    metadata: {
      jobFamily: job.JobFamily,
      jobFunction: job.JobFunction,
      primaryLocationCountry: job.PrimaryLocationCountry
    },
    raw: job
  };
}

async function fetchOracleHcmPostings(
  context: AdapterFetchContext
): Promise<AdapterFetchedPosting[]> {
  const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 24), 200);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 10);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < maxPages && offset < total) {
    const response = await fetchJson<OracleHcmResponse>(
      context,
      buildOracleSearchUrl(context, offset, pageSize)
    );
    const item = response.items?.[0];
    const jobs = item?.requisitionList ?? [];

    total =
      typeof item?.TotalJobsCount === "number"
        ? item.TotalJobsCount
        : typeof item?.totalJobsCount === "number"
          ? item.totalJobsCount
          : total;

    if (jobs.length === 0) {
      break;
    }

    for (const job of jobs) {
      const posting = normalizeOraclePosting(context, job);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (jobs.length < pageSize) {
      break;
    }

    offset += jobs.length;
    page += 1;
  }

  return postings;
}

function buildSmartRecruitersSearchUrl(
  context: AdapterFetchContext,
  offset: number,
  limit: number
): string {
  const url = new URL(context.source.sourceUrl);
  const query = getStringConfig(context.source.requestConfigJson?.query, "intern");

  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  if (query) {
    url.searchParams.set("q", query);
  }

  return url.toString();
}

function buildSmartRecruitersDetailUrl(sourceUrl: string, jobId: string): string {
  const url = new URL(sourceUrl);
  const detailPath = `${url.pathname.replace(/\/$/, "")}/${encodeURIComponent(jobId)}`;

  return new URL(detailPath, url.origin).toString();
}

function extractSmartRecruitersCompanyPath(context: AdapterFetchContext): string {
  const match = new URL(context.source.sourceUrl).pathname.match(/\/companies\/([^/]+)/i);

  return match?.[1] || context.company.name.replace(/\s+/g, "");
}

function buildSmartRecruitersDescriptionHtml(job: SmartRecruitersJob): string | undefined {
  const sections = Object.values(job.jobAd?.sections ?? {})
    .map((section) => {
      if (!section.text) {
        return undefined;
      }

      return section.title ? `<h2>${section.title}</h2><div>${section.text}</div>` : section.text;
    })
    .filter((section): section is string => Boolean(section));

  return sections.length > 0 ? sections.join("<br/><br/>") : undefined;
}

function normalizeSmartRecruitersPosting(
  context: AdapterFetchContext,
  job: SmartRecruitersJob
): AdapterFetchedPosting | undefined {
  const title = normalizeWhitespace(job.name || "");
  const externalJobId = normalizeWhitespace(job.refNumber || job.id || job.uuid || "");

  if (!externalJobId || !title) {
    return undefined;
  }

  const companyPath = extractSmartRecruitersCompanyPath(context);
  const sourceUrl =
    job.postingUrl ||
    (job.id
      ? `https://jobs.smartrecruiters.com/${companyPath}/${encodeURIComponent(job.id)}-${slugifyForUrl(title)}`
      : "");
  const applicationUrl = job.applyUrl || sourceUrl;
  const locationRaw = normalizeWhitespace(
    uniqueStrings([job.location?.city, job.location?.region, job.location?.country]).join(", ")
  );
  const descriptionHtml = buildSmartRecruitersDescriptionHtml(job);

  if (!sourceUrl || !applicationUrl) {
    return undefined;
  }

  return {
    externalJobId,
    title,
    applicationUrl,
    sourceUrl,
    postingDate: job.releasedDate,
    descriptionHtml,
    descriptionText: descriptionHtml ? stripHtml(descriptionHtml) : undefined,
    employmentType: job.typeOfEmployment?.label || undefined,
    locationRaw: locationRaw || undefined,
    remoteTypeHint: job.location?.remote ? "Remote" : undefined,
    metadata: {
      department: job.department?.label,
      industry: job.industry?.label,
      typeOfEmploymentId: job.typeOfEmployment?.id
    },
    raw: job
  };
}

async function fetchSmartRecruitersPostings(
  context: AdapterFetchContext
): Promise<AdapterFetchedPosting[]> {
  const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 100), 100);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 3);
  const fetchDetails = getBooleanConfig(context.source.requestConfigJson?.fetchDetails, true);
  const detailConcurrency =
    context.source.requestConfigJson?.detailConcurrency ?? DEFAULT_DETAIL_CONCURRENCY;
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < maxPages && offset < total) {
    const response = await fetchJson<SmartRecruitersSearchResponse>(
      context,
      buildSmartRecruitersSearchUrl(context, offset, pageSize)
    );
    const jobs = response.content ?? [];

    total = typeof response.totalFound === "number" ? response.totalFound : total;

    if (jobs.length === 0) {
      break;
    }

    const pagePostings = await mapWithConcurrency(jobs, detailConcurrency, async (job) => {
      const detail =
        fetchDetails && job.id
          ? await fetchJson<SmartRecruitersJob>(
              context,
              buildSmartRecruitersDetailUrl(context.source.sourceUrl, job.id)
            )
          : job;
      return normalizeSmartRecruitersPosting(context, { ...job, ...detail });
    });

    for (const posting of pagePostings) {
      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (jobs.length < pageSize) {
      break;
    }

    offset += jobs.length;
    page += 1;
  }

  return postings;
}

function buildEightfoldJobsUrl(context: AdapterFetchContext, start: number): string {
  const url = new URL(context.source.sourceUrl);
  const query = getStringConfig(context.source.requestConfigJson?.query);

  url.searchParams.set("start", String(start));

  if (query) {
    url.searchParams.set("query", query);
  }

  return url.toString();
}

function normalizeEightfoldPosting(job: EightfoldJob): AdapterFetchedPosting | undefined {
  const externalJobId = asNormalizedString(job.display_job_id ?? job.ats_job_id ?? job.id);
  const title = normalizeWhitespace(job.posting_name || job.name || "");
  const sourceUrl = job.canonicalPositionUrl || "";

  if (!externalJobId || !title || !sourceUrl) {
    return undefined;
  }

  const locations = uniqueStrings(
    [job.location, ...(job.locations ?? [])]
      .map((location) => (location ? normalizeWhitespace(location) : ""))
      .filter(Boolean)
  );
  const postingDate =
    typeof job.t_create === "number"
      ? new Date(job.t_create * 1_000)
      : typeof job.t_update === "number"
        ? new Date(job.t_update * 1_000)
        : undefined;

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate,
    descriptionHtml: job.job_description || undefined,
    descriptionText: job.job_description ? stripHtml(job.job_description) : undefined,
    employmentType: job.type || undefined,
    locationRaw: locations[0],
    additionalLocations: locations.slice(1),
    remoteTypeHint: job.work_location_option ?? job.location_flexibility ?? undefined,
    metadata: {
      businessUnit: job.business_unit,
      department: job.department,
      isPrivate: job.isPrivate
    },
    raw: job
  };
}

async function fetchEightfoldPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const pageSize = getNumericConfig(context.source.requestConfigJson?.pageSize, 10);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 10);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let page = 0;
  let start = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < maxPages && start < total) {
    const response = await fetchJson<EightfoldJobsResponse>(
      context,
      buildEightfoldJobsUrl(context, start)
    );
    const jobs = response.positions ?? [];

    total = typeof response.count === "number" ? response.count : total;

    if (jobs.length === 0) {
      break;
    }

    for (const job of jobs) {
      const posting = normalizeEightfoldPosting(job);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (jobs.length < pageSize) {
      break;
    }

    start += jobs.length;
    page += 1;
  }

  return postings;
}

function buildPhenomSearchBody(context: AdapterFetchContext, from: number, size: number): string {
  return JSON.stringify({
    size,
    from,
    jobs: true,
    counts: true,
    all_fields: getStringArrayConfig(context.source.requestConfigJson?.allFields),
    clearAll: false,
    jdsource: "facets",
    isSliderEnable: false,
    selected_fields:
      context.source.requestConfigJson?.selectedFields &&
      typeof context.source.requestConfigJson.selectedFields === "object" &&
      !Array.isArray(context.source.requestConfigJson.selectedFields)
        ? context.source.requestConfigJson.selectedFields
        : {},
    sort: { order: "desc", field: "postedDate" },
    pageName: getStringConfig(context.source.requestConfigJson?.pageName, "search-results"),
    siteType: getStringConfig(context.source.requestConfigJson?.siteType, "external"),
    deviceType: getStringConfig(context.source.requestConfigJson?.deviceType, "desktop"),
    global: getBooleanConfig(context.source.requestConfigJson?.global, true),
    ddoKey: "refineSearch",
    refNum: getStringConfig(context.source.requestConfigJson?.refNum),
    lang: getStringConfig(context.source.requestConfigJson?.lang, "en_us"),
    locale: getStringConfig(context.source.requestConfigJson?.locale, "en_us"),
    country: getStringConfig(context.source.requestConfigJson?.country, "us"),
    pageId: getStringConfig(context.source.requestConfigJson?.pageId),
    keywords: getStringConfig(context.source.requestConfigJson?.query, "intern")
  });
}

function buildPhenomDetailUrl(context: AdapterFetchContext, job: PhenomJob): string | undefined {
  const detailBaseUrl = getStringConfig(context.source.requestConfigJson?.detailBaseUrl);
  const sequenceNumber = asNormalizedString(job.jobSeqNo);

  if (!detailBaseUrl || !sequenceNumber || !job.title) {
    return undefined;
  }

  return `${detailBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(sequenceNumber)}/${slugifyForUrl(job.title)}`;
}

function extractPhenomLocations(job: PhenomJob): string[] {
  return uniqueStrings(
    [
      job.location,
      job.cityStateCountry,
      job.cityState,
      [job.city, job.state, job.country].filter(Boolean).join(", "),
      ...(job.multi_location ?? []),
      ...(job.multi_location_array ?? []).map((entry) => entry.location)
    ]
      .map((location) => (location ? normalizeWhitespace(location) : ""))
      .filter(Boolean)
  );
}

function normalizePhenomPosting(
  context: AdapterFetchContext,
  job: PhenomJob
): AdapterFetchedPosting | undefined {
  const externalJobId = asNormalizedString(job.jobSeqNo ?? job.reqId ?? job.jobId);
  const title = normalizeWhitespace(job.title || "");
  const applicationUrl = normalizeWhitespace(job.applyUrl || "");

  if (!externalJobId || !title || !applicationUrl) {
    return undefined;
  }

  const sourceUrl = buildPhenomDetailUrl(context, job) ?? applicationUrl;
  const locations = extractPhenomLocations(job);
  const descriptionText = normalizeWhitespace(
    job.ml_job_parser?.descriptionTeaser_ats ||
      job.ml_job_parser?.descriptionTeaser_keyword ||
      job.ml_job_parser?.descriptionTeaser ||
      job.descriptionTeaser ||
      ""
  );

  return {
    externalJobId,
    title,
    applicationUrl,
    sourceUrl,
    postingDate: job.postedDate ?? job.dateCreated,
    descriptionText: descriptionText || undefined,
    employmentType: job.type || undefined,
    locationRaw: locations[0],
    additionalLocations: locations.slice(1),
    remoteTypeHint: job.RemoteType,
    metadata: {
      category: job.category,
      categoryRaw: job.category_raw,
      department: job.department,
      jobId: job.jobId,
      reqId: job.reqId
    },
    raw: job
  };
}

async function fetchPhenomPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 10), 50);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 5);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let from = 0;
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < maxPages && from < total) {
    const response = await fetchJsonRequest<PhenomRefineSearchResponse>(
      context,
      context.source.sourceUrl,
      {
        method: "POST",
        body: buildPhenomSearchBody(context, from, pageSize),
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    const data = response.refineSearch?.data;
    const jobs = data?.jobs ?? [];

    total = typeof data?.totalHits === "number" ? data.totalHits : total;

    if (jobs.length === 0) {
      break;
    }

    for (const job of jobs) {
      const posting = normalizePhenomPosting(context, job);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (jobs.length < pageSize) {
      break;
    }

    from += jobs.length;
    page += 1;
  }

  return postings;
}

function getTikTokHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Origin: "https://lifeattiktok.com",
    Referer: "https://lifeattiktok.com/search?keyword=intern",
    "accept-language": "en-US",
    "website-path": "tiktok"
  };
}

function getTikTokLocationNames(location: TikTokLocation | null | undefined): string[] {
  const names: string[] = [];
  let current: TikTokLocation | null | undefined = location;

  while (current) {
    const name = current.en_name || current.i18n_name;

    if (name) {
      names.push(normalizeWhitespace(name));
    }

    current = current.parent;
  }

  return uniqueStrings(names);
}

function isTikTokLocationInCountry(location: TikTokLocation, countryName: string): boolean {
  return getTikTokLocationNames(location).some(
    (name) => name.toLowerCase() === countryName.toLowerCase()
  );
}

function collectTikTokLocationCodes(locations: TikTokLocation[], countryName: string): string[] {
  const codes: string[] = [];

  for (const location of locations) {
    if (Array.isArray(location.children) && location.children.length > 0) {
      codes.push(...collectTikTokLocationCodes(location.children, countryName));
    }

    if (location.code && isTikTokLocationInCountry(location, countryName)) {
      codes.push(location.code);
    }
  }

  return uniqueStrings(codes);
}

function chunkStrings(values: string[], size: number): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function getTikTokLocationCodeGroups(context: AdapterFetchContext): Promise<string[][]> {
  const configuredLocations = getStringArrayConfig(context.source.requestConfigJson?.locationCodes);

  if (configuredLocations.length > 0) {
    return chunkStrings(configuredLocations, 20);
  }

  const filtersUrl = getStringConfig(
    context.source.requestConfigJson?.filtersUrl,
    "https://api.lifeattiktok.com/api/v1/public/supplier/config/job/filters"
  );
  const countryName = getStringConfig(
    context.source.requestConfigJson?.countryName,
    "United States of America"
  );
  const response = await fetchJsonRequest<TikTokFiltersResponse>(context, filtersUrl, {
    method: "POST",
    body: "{}",
    headers: getTikTokHeaders()
  });
  const locationCodes = collectTikTokLocationCodes(response.data?.city_list ?? [], countryName);
  const batchSize = Math.max(1, getNumericConfig(context.source.requestConfigJson?.locationBatchSize, 20));

  return locationCodes.length > 0 ? chunkStrings(locationCodes, batchSize) : [[]];
}

function buildTikTokSearchBody(
  context: AdapterFetchContext,
  offset: number,
  limit: number,
  locationCodes: string[]
): string {
  return JSON.stringify({
    keyword: getStringConfig(context.source.requestConfigJson?.query, "intern"),
    limit,
    offset,
    job_category_id_list: getStringArrayConfig(context.source.requestConfigJson?.jobCategoryIds),
    location_code_list: locationCodes,
    subject_id_list: getStringArrayConfig(context.source.requestConfigJson?.subjectIds),
    recruitment_id_list: getStringArrayConfig(context.source.requestConfigJson?.recruitmentIds)
  });
}

function normalizeTikTokPosting(job: TikTokJob): AdapterFetchedPosting | undefined {
  const externalJobId = asNormalizedString(job.code ?? job.id);
  const title = normalizeWhitespace(job.title || "");

  if (!externalJobId || !title) {
    return undefined;
  }

  const sourceUrl = job.code
    ? `https://lifeattiktok.com/search?job_code=${encodeURIComponent(job.code)}`
    : `https://lifeattiktok.com/search?job_id=${encodeURIComponent(String(job.id))}`;
  const descriptionText = normalizeWhitespace(
    [job.description, job.requirement].filter(Boolean).join("\n\n")
  );
  const min = job.job_post_info?.min_salary ?? undefined;
  const max = job.job_post_info?.max_salary ?? undefined;

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    descriptionText: descriptionText || undefined,
    employmentType: job.recruit_type?.en_name || undefined,
    locationRaw: getTikTokLocationNames(job.city_info).join(", ") || undefined,
    compensation:
      min !== undefined || max !== undefined
        ? {
            min,
            max,
            currency: job.job_post_info?.currency ?? undefined,
            known: true
          }
        : undefined,
    metadata: {
      category: job.job_category?.en_name,
      department: job.department_info?.en_name ?? job.department_info?.name,
      requiredDegree: job.job_post_info?.required_degree,
      subject: job.job_subject?.en_name,
      tiktokJobId: job.id
    },
    raw: job
  };
}

async function fetchTikTokPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 50), 100);
  const maxPagesPerLocation = getNumericConfig(
    context.source.requestConfigJson?.maxPagesPerLocation,
    3
  );
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  const locationCodeGroups = await getTikTokLocationCodeGroups(context);

  for (const locationCodes of locationCodeGroups) {
    let offset = 0;
    let page = 0;
    let total = Number.POSITIVE_INFINITY;

    while (page < maxPagesPerLocation && offset < total) {
      const response = await fetchJsonRequest<TikTokSearchResponse>(context, context.source.sourceUrl, {
        method: "POST",
        body: buildTikTokSearchBody(context, offset, pageSize, locationCodes),
        headers: getTikTokHeaders()
      });
      const jobs = response.data?.job_post_list ?? [];

      total = typeof response.data?.count === "number" ? response.data.count : total;

      if (jobs.length === 0) {
        break;
      }

      for (const job of jobs) {
        const posting = normalizeTikTokPosting(job);

        if (!posting || seen.has(posting.externalJobId)) {
          continue;
        }

        seen.add(posting.externalJobId);
        postings.push(posting);
      }

      if (jobs.length < pageSize) {
        break;
      }

      offset += jobs.length;
      page += 1;
    }
  }

  return postings;
}

function formatUberLocation(location: UberLocation | undefined): string | undefined {
  if (!location) {
    return undefined;
  }

  return (
    normalizeWhitespace(
      uniqueStrings([location.city ?? undefined, location.region ?? undefined, location.countryName ?? undefined]).join(", ")
    ) || undefined
  );
}

function normalizeUberPosting(job: UberJob): AdapterFetchedPosting | undefined {
  const externalJobId = asNormalizedString(job.id);
  const title = normalizeWhitespace(job.title || "");

  if (!externalJobId || !title) {
    return undefined;
  }

  const locations = uniqueStrings(
    (job.allLocations && job.allLocations.length > 0 ? job.allLocations : [job.location])
      .map((location) => formatUberLocation(location))
      .filter((location): location is string => Boolean(location))
  );
  const sourceUrl = `https://www.uber.com/us/en/careers/list/${encodeURIComponent(externalJobId)}/`;

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate: job.creationDate ?? job.updatedDate,
    descriptionText: job.description ? stripHtml(job.description) : undefined,
    employmentType: job.timeType || job.type || undefined,
    locationRaw: locations[0],
    additionalLocations: locations.slice(1),
    metadata: {
      department: job.department,
      level: job.level,
      programAndPlatform: job.programAndPlatform,
      team: job.team,
      updatedDate: job.updatedDate
    },
    raw: job
  };
}

function getUberTotal(value: UberSearchResponse["data"]): number {
  if (!value || typeof value !== "object") {
    return Number.POSITIVE_INFINITY;
  }

  const totalResults = (value as { totalResults?: { low?: number } | number }).totalResults;

  if (typeof totalResults === "number") {
    return totalResults;
  }

  return typeof totalResults?.low === "number" ? totalResults.low : Number.POSITIVE_INFINITY;
}

async function fetchUberPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 25), 100);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 4);
  const query = getStringConfig(context.source.requestConfigJson?.query, "intern");
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < maxPages && postings.length < total) {
    const response = await fetchJsonRequest<UberSearchResponse>(context, context.source.sourceUrl, {
      method: "POST",
      body: JSON.stringify({
        limit: pageSize,
        page,
        params: {
          query
        }
      }),
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.uber.com",
        Referer: `https://www.uber.com/us/en/careers/list/?query=${encodeURIComponent(query)}`,
        "x-csrf-token": "x"
      }
    });
    const jobs = response.data?.results ?? [];

    total = getUberTotal(response.data);

    if (jobs.length === 0) {
      break;
    }

    for (const job of jobs) {
      const posting = normalizeUberPosting(job);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (jobs.length < pageSize) {
      break;
    }

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
      case "eightfold-jobs":
        return fetchEightfoldPostings(context);
      case "github-jibe-jobs":
      case "jibe-jobs":
        return fetchJibePostings(context);
      case "generic-rss-items":
        return fetchGenericRssPostings(context);
      case "ibm-careers-search":
        return fetchIbmCareersPostings(context);
      case "meta-careers-search":
        return fetchMetaCareersPostings(context);
      case "microsoft-pcsx-search":
      case "pcsx-search":
        return fetchMicrosoftPostings(context);
      case "oracle-hcm-search":
        return fetchOracleHcmPostings(context);
      case "phenom-refine-search":
        return fetchPhenomPostings(context);
      case "salesforce-rss":
        return fetchSalesforceRssPostings(context);
      case "smartrecruiters-postings":
        return fetchSmartRecruitersPostings(context);
      case "tiktok-search":
        return fetchTikTokPostings(context);
      case "uber-search":
        return fetchUberPostings(context);
      default:
        return [];
    }
  }
}
