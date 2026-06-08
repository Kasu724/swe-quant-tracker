import { decodeHtmlEntities, normalizeWhitespace, uniqueStrings } from "../normalization/text";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { fetchText, type SourceAdapter } from "./base";

type CustomHtmlParserId =
  | "apple-search"
  | "deshaw-careers"
  | "drw-listings"
  | "gresearch-vacancies"
  | "netflix-smartapply-search"
  | "google-careers-search"
  | "paylocity-page-data"
  | "shopify-careers"
  | "talentbrew-search"
  | "bloomberg-avature-search"
  | "two-sigma-avature-cards";

type NetflixPosition = {
  id?: number | string;
  name?: string;
  posting_name?: string;
  location?: string;
  locations?: string[];
  t_create?: number;
  t_update?: number;
  ats_job_id?: string;
  display_job_id?: string;
  job_description?: string;
  work_location_option?: string;
  location_flexibility?: string | null;
  canonicalPositionUrl?: string;
  department?: string;
  business_unit?: string;
  locale?: string;
};

type DrwListing = {
  title?: string;
  id?: number | string;
  internal_job_id?: number | string;
  slug?: string;
  job_title?: string;
  locations?: string[];
  career_countries?: string[];
  career_categories?: string[];
  job_keywords?: string[];
  keywords?: string[];
  language?: string;
};

type DeshawJobEnvelope = {
  data?: {
    id?: number | string;
    displayName?: string;
    validFromDate?: string;
    jobUrl?: string;
    jobDescription?: {
      websiteDescription?: string;
      onCampusDescription?: string;
    };
    jobMetadata?: {
      jobLocations?: Array<{ name?: string }>;
      jobSeekerCategories?: Array<{ name?: string }>;
    };
    jobCategory?: Array<{ name?: string }>;
    department?: { name?: string };
    hireType?: { name?: string };
  };
};

type PaylocityPageData = {
  Jobs?: PaylocityJob[];
};

type PaylocityJob = {
  JobId?: number | string;
  JobTitle?: string;
  LocationName?: string;
  PublishedDate?: string;
  Description?: string;
  IsRemote?: boolean;
  HiringDepartment?: string | null;
  JobLocation?: {
    City?: string;
    State?: string;
    Country?: string;
  };
};

const APPLE_CARD_START_PATTERN = /<div id="search-search-job-title-(?<jobKey>[^"]+)-\d+"/gi;
const APPLE_LINK_PATTERN =
  /<h3>\s*<a\b[^>]*href="(?<href>[^"]+)"[^>]*>(?<title>[\s\S]*?)<\/a>\s*<\/h3>/i;
const APPLE_TEAM_PATTERN =
  /<span\b[^>]*class="[^"]*\bteam-name\b[^"]*"[^>]*>(?<team>[\s\S]*?)<\/span>/i;
const APPLE_POSTED_DATE_PATTERN =
  /<span\b[^>]*class="[^"]*\bjob-posted-date\b[^"]*"[^>]*>(?<postingDate>[\s\S]*?)<\/span>/i;
const APPLE_LOCATION_PATTERNS = [
  /<span\b[^>]*class="[^"]*\btable--advanced-search__location-sub\b[^"]*"[^>]*>(?<location>[\s\S]*?)<\/span>/i,
  /<span\b[^>]*id="search-store-name(?:-container)?-\d+"[^>]*>(?<location>[\s\S]*?)<\/span>/i
];
const APPLE_CARD_SCAN_LIMIT = 12_000;
const GOOGLE_INIT_DATA_PATTERN = /AF_initDataCallback\((\{key: 'ds:1'[\s\S]*?sideChannel:\s*\{\}\})\);/;
const GOOGLE_RESULT_HREF_PATTERN =
  /href="(?<href>jobs\/results\/(?<jobId>\d+)-[^"]+)"/g;
const SHOPIFY_JOB_CARD_PATTERN =
  /<a\b(?=[^>]*href="(?<href>\/careers\/[^"#?]*_[^"]+)")[^>]*>[\s\S]*?<h4\b[^>]*>(?<title>[\s\S]*?)<\/h4>[\s\S]*?<span\b[^>]*>(?<location>[\s\S]*?)<\/span>[\s\S]*?<\/a>/gi;
const BLOOMBERG_ARTICLE_PATTERN =
  /<article\b[^>]*class="[^"]*article--result[^"]*"[^>]*>(?<body>[\s\S]*?)<\/article>/gi;
const BLOOMBERG_LINK_PATTERN =
  /<a\b[^>]*href="(?<href>[^"]+)"[^>]*>(?<title>[\s\S]*?)<\/a>/i;
const BLOOMBERG_LOCATION_PATTERN =
  /<span\b[^>]*class="[^"]*list-item-location[^"]*"[^>]*>(?<location>[\s\S]*?)<\/span>/i;
const GRESEARCH_CARD_PATTERN =
  /<a\b(?=[^>]*class="[^"]*\bc-vacancy-result\b[^"]*")(?=[^>]*href="(?<href>[^"]+)")[^>]*>(?<body>[\s\S]*?)<\/a>/gi;
const VACANCY_TITLE_PATTERN =
  /<span\b[^>]*class="[^"]*\bc-vacancy-result__title\b[^"]*"[^>]*>(?<title>[\s\S]*?)<\/span>/i;
const VACANCY_LOCATION_PATTERN =
  /<span\b[^>]*class="[^"]*\bc-vacancy-result__location\b[^"]*"[^>]*>(?<location>[\s\S]*?)<\/span>/i;
const NEXT_PAGE_PATTERN = /<link\b[^>]*rel=["']next["'][^>]*href=["'](?<href>[^"']+)["'][^>]*>/i;
const TWO_SIGMA_ARTICLE_PATTERN =
  /<article\b[^>]*class="[^"]*\barticle--card\b[^"]*"[^>]*>(?<body>[\s\S]*?)<\/article>/gi;
const TWO_SIGMA_FIELD_PATTERN =
  /<strong>(?<label>[^<]+)<\/strong>\s*<span\b[^>]*class="[^"]*\bparagraph_inner-span\b[^"]*"[^>]*>(?<value>[\s\S]*?)<\/span>/gi;
const PAYLOCITY_PAGE_DATA_PATTERN = /window\.pageData\s*=\s*(?<json>\{[\s\S]*?\});\s*<\/script>/i;
const TALENTBREW_JOB_CARD_PATTERN =
  /<li\b[^>]*class="[^"]*\bjob-card\b[^"]*"[^>]*>(?<body>[\s\S]*?)<\/li>/gi;
const TALENTBREW_TITLE_PATTERN =
  /<a\b(?=[^>]*class="[^"]*\bjob-card__title\b[^"]*")(?=[^>]*href="(?<href>[^"]+)")(?=[^>]*data-job-id="(?<jobId>[^"]+)")[^>]*>(?<title>[\s\S]*?)<\/a>/i;
const TALENTBREW_INTRO_PATTERN =
  /<span\b[^>]*class="[^"]*\bjob-card__intro\b[^"]*"[^>]*>(?<intro>[\s\S]*?)<\/span>/i;
const TALENTBREW_LOCATION_PATTERN =
  /<span\b[^>]*class="[^"]*\blocation\b[^"]*"[^>]*>(?<location>[\s\S]*?)<\/span>/i;
const TALENTBREW_CATEGORY_PATTERN =
  /<span\b[^>]*class="[^"]*\bcategory\b[^"]*"[^>]*>(?<category>[\s\S]*?)<\/span>/i;

function getParserId(context: AdapterFetchContext): CustomHtmlParserId {
  const parserId = context.source.parserConfigJson?.parserId;

  if (
    parserId === "apple-search" ||
    parserId === "deshaw-careers" ||
    parserId === "drw-listings" ||
    parserId === "gresearch-vacancies" ||
    parserId === "netflix-smartapply-search" ||
    parserId === "google-careers-search" ||
    parserId === "paylocity-page-data" ||
    parserId === "shopify-careers" ||
    parserId === "talentbrew-search" ||
    parserId === "bloomberg-avature-search" ||
    parserId === "two-sigma-avature-cards"
  ) {
    return parserId;
  }

  throw new Error(`Unsupported CUSTOM_HTML parserId: ${String(parserId ?? "undefined")}`);
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

function getPositiveNumericConfig(value: unknown, fallback: number): number {
  const parsed = getNumericConfig(value, fallback);

  return parsed > 0 ? parsed : fallback;
}

function toAbsoluteUrl(baseUrl: string, href: string): string {
  return new URL(href, baseUrl).toString();
}

function extractNextDataJson<T>(html: string): T {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);

  if (!match?.[1]) {
    throw new Error("Unable to find Next.js __NEXT_DATA__ payload");
  }

  return JSON.parse(match[1]) as T;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeWhitespace(decodeHtmlEntities(value)) : undefined;
}

function asHtmlFragment(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return asString(value[1]);
}

function timestampTupleToDate(value: unknown): Date | undefined {
  if (!Array.isArray(value) || typeof value[0] !== "number") {
    return undefined;
  }

  const seconds = value[0];
  const nanos = typeof value[1] === "number" ? value[1] : 0;

  return new Date(seconds * 1_000 + Math.floor(nanos / 1_000_000));
}

function cleanInlineHtml(value?: string): string {
  return normalizeWhitespace(decodeHtmlEntities((value ?? "").replace(/<[^>]+>/g, " ")));
}

function extractAppleLocation(cardHtml: string): string {
  for (const pattern of APPLE_LOCATION_PATTERNS) {
    const match = cardHtml.match(pattern);
    const location = cleanInlineHtml(match?.groups?.location);

    if (location) {
      return location;
    }
  }

  return "";
}

function parseApplePage(html: string, baseUrl: string): AdapterFetchedPosting[] {
  const postings: AdapterFetchedPosting[] = [];
  const starts = Array.from(html.matchAll(APPLE_CARD_START_PATTERN));

  for (let index = 0; index < starts.length; index += 1) {
    const match = starts[index];
    const groups = match.groups;
    const startIndex = match.index ?? 0;

    if (!groups?.jobKey) {
      continue;
    }

    const nextStartIndex = starts[index + 1]?.index ?? html.length;
    const cardHtml = html.slice(startIndex, Math.min(nextStartIndex, startIndex + APPLE_CARD_SCAN_LIMIT));
    const linkMatch = cardHtml.match(APPLE_LINK_PATTERN);
    const href = linkMatch?.groups?.href;
    const title = cleanInlineHtml(linkMatch?.groups?.title);

    if (!href || !title) {
      continue;
    }

    const locationRaw = extractAppleLocation(cardHtml);
    const postingDateRaw = cleanInlineHtml(cardHtml.match(APPLE_POSTED_DATE_PATTERN)?.groups?.postingDate);
    const team = cleanInlineHtml(cardHtml.match(APPLE_TEAM_PATTERN)?.groups?.team);
    const applicationUrl = toAbsoluteUrl(baseUrl, decodeHtmlEntities(href));

    postings.push({
      externalJobId: groups.jobKey,
      title,
      applicationUrl,
      sourceUrl: applicationUrl,
      postingDate: postingDateRaw || undefined,
      locationRaw: locationRaw || undefined,
      metadata: {
        team: team || undefined
      },
      raw: {
        jobKey: groups.jobKey,
        href,
        title,
        locationRaw,
        postingDate: postingDateRaw,
        team
      }
    });
  }

  return postings;
}

async function fetchApplePostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 6);
  const pageSize = getPositiveNumericConfig(context.source.requestConfigJson?.pageSize, 20);
  const seen = new Set<string>();
  const postings: AdapterFetchedPosting[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(context.source.sourceUrl);

    if (page > 1) {
      url.searchParams.set("page", String(page));
    }

    const pagePostings = parseApplePage(await fetchText(context, url.toString()), url.origin);

    if (pagePostings.length === 0) {
      break;
    }

    let newCount = 0;

    for (const posting of pagePostings) {
      if (seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
      newCount += 1;
    }

    if (newCount === 0) {
      break;
    }

    if (pagePostings.length < pageSize) {
      break;
    }
  }

  return postings;
}

function parseGoogleInitData(html: string): { data?: unknown[] } {
  const match = html.match(GOOGLE_INIT_DATA_PATTERN);

  if (!match?.[1]) {
    throw new Error("Unable to find Google careers init data");
  }

  return Function(`return (${match[1]})`)() as { data?: unknown[] };
}

function buildGoogleHrefMap(html: string, baseUrl: string): Map<string, string> {
  const base = new URL("/about/careers/applications/", baseUrl).toString();
  const hrefMap = new Map<string, string>();

  for (const match of html.matchAll(GOOGLE_RESULT_HREF_PATTERN)) {
    const groups = match.groups;

    if (!groups?.jobId || !groups.href) {
      continue;
    }

    hrefMap.set(groups.jobId, toAbsoluteUrl(base, decodeHtmlEntities(groups.href)));
  }

  return hrefMap;
}

function formatGoogleLocations(value: unknown): {
  locationRaw?: string;
  additionalLocations: string[];
} {
  if (!Array.isArray(value)) {
    return {
      additionalLocations: []
    };
  }

  const locations = uniqueStrings(
    value.map((entry) => (Array.isArray(entry) ? asString(entry[0]) : undefined))
  );

  return {
    locationRaw: locations[0],
    additionalLocations: locations.slice(1)
  };
}

function buildGoogleDescription(job: unknown[]): string | undefined {
  const sections = [
    asHtmlFragment(job[10]),
    asHtmlFragment(job[3]),
    asHtmlFragment(job[4]),
    asHtmlFragment(job[15]),
    asHtmlFragment(job[18]),
    asHtmlFragment(job[19])
  ].filter((section): section is string => Boolean(section));

  return sections.length > 0 ? sections.join("<br/><br/>") : undefined;
}

function normalizeGooglePosting(
  job: unknown[],
  hrefMap: Map<string, string>,
  baseUrl: string
): AdapterFetchedPosting | undefined {
  const externalJobId = asString(job[0]);
  const title = asString(job[1]);
  const applicationUrl = asString(job[2]);

  if (!externalJobId || !title || !applicationUrl) {
    return undefined;
  }

  const { locationRaw, additionalLocations } = formatGoogleLocations(job[9]);
  const sourceUrl = hrefMap.get(externalJobId);
  const postingDate =
    timestampTupleToDate(job[12]) ??
    timestampTupleToDate(job[13]) ??
    timestampTupleToDate(job[14]);

  return {
    externalJobId,
    title,
    applicationUrl,
    sourceUrl: sourceUrl ?? applicationUrl,
    postingDate,
    descriptionHtml: buildGoogleDescription(job),
    locationRaw,
    additionalLocations,
    metadata: {
      companyName: asString(job[7]),
      companyResourcePath: asString(job[5]),
      locale: asString(job[8]),
      categoryIndexes: Array.isArray(job[11]) ? job[11] : undefined
    },
    raw: job
  };
}

function buildGoogleSearchUrl(sourceUrl: string, page: number): string {
  const url = new URL(sourceUrl);

  if (!url.searchParams.has("q")) {
    url.searchParams.set("q", "intern");
  }

  if (page > 1) {
    url.searchParams.set("page", String(page));
  } else {
    url.searchParams.delete("page");
  }

  return url.toString();
}

async function fetchGooglePostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 3);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();
  let totalPages = 1;

  for (let page = 1; page <= Math.min(maxPages, totalPages); page += 1) {
    const searchUrl = buildGoogleSearchUrl(context.source.sourceUrl, page);
    const html = await fetchText(context, searchUrl);
    const initData = parseGoogleInitData(html);
    const jobs = Array.isArray(initData.data?.[0]) ? (initData.data?.[0] as unknown[]) : [];
    const total =
      typeof initData.data?.[2] === "number" ? (initData.data[2] as number) : jobs.length;
    const pageSize =
      typeof initData.data?.[3] === "number" ? (initData.data[3] as number) : jobs.length || 20;

    totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

    if (jobs.length === 0) {
      break;
    }

    const hrefMap = buildGoogleHrefMap(html, searchUrl);

    for (const job of jobs) {
      if (!Array.isArray(job)) {
        continue;
      }

      const posting = normalizeGooglePosting(job, hrefMap, searchUrl);

      if (!posting || seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }
  }

  return postings;
}

async function fetchDrwPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const html = await fetchText(context, context.source.sourceUrl);
  const payload = extractNextDataJson<{
    props?: {
      pageProps?: {
        jobData?: {
          en?: DrwListing[];
        };
      };
    };
  }>(html);
  const jobs = Array.isArray(payload.props?.pageProps?.jobData?.en)
    ? payload.props?.pageProps?.jobData?.en
    : [];

  return jobs.flatMap((job) => {
    const externalJobId = job.internal_job_id ?? job.id ?? job.slug;
    const title = job.job_title ?? job.title;

    if (!externalJobId || !title || !job.slug) {
      return [];
    }

    const locations = uniqueStrings(
      Array.isArray(job.locations)
        ? job.locations.map((location) => normalizeWhitespace(location)).filter(Boolean)
        : []
    );
    const detailUrl = toAbsoluteUrl(context.source.sourceUrl, `/work-at-drw/listings/${job.slug}`);

    return [
      {
        externalJobId: String(externalJobId),
        title,
        applicationUrl: detailUrl,
        sourceUrl: detailUrl,
        locationRaw: locations[0],
        additionalLocations: locations.slice(1),
        metadata: {
          careerCategories: job.career_categories,
          careerCountries: job.career_countries,
          jobKeywords: job.job_keywords,
          keywords: job.keywords,
          language: job.language
        },
        raw: job
      }
    ];
  });
}

function extractEmbeddedCodeBlock(html: string, id: string): string {
  const match = html.match(
    new RegExp(`<code id="${id}"[^>]*>([\\s\\S]*?)<\\/code>`, "i")
  );

  if (!match?.[1]) {
    throw new Error(`Unable to find embedded code block: ${id}`);
  }

  return decodeHtmlEntities(match[1]);
}

function findPositions(value: unknown): NetflixPosition[] {
  if (Array.isArray(value) && value.every((entry) => entry && typeof entry === "object")) {
    const positions = value as NetflixPosition[];

    if (positions.some((position) => typeof position.canonicalPositionUrl === "string")) {
      return positions;
    }
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  for (const nestedValue of Object.values(value as Record<string, unknown>)) {
    const positions = findPositions(nestedValue);

    if (positions.length > 0) {
      return positions;
    }
  }

  return [];
}

async function fetchNetflixPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const html = await fetchText(context, context.source.sourceUrl);
  const payload = JSON.parse(extractEmbeddedCodeBlock(html, "smartApplyData")) as Record<
    string,
    unknown
  >;
  const positions = findPositions(payload);

  return positions
    .filter((position) => Boolean(position.canonicalPositionUrl))
    .map((position) => {
      const locations = Array.isArray(position.locations)
        ? position.locations.filter((location): location is string => Boolean(location))
        : [];
      const applicationUrl = position.canonicalPositionUrl!;

      return {
        externalJobId:
          position.ats_job_id ?? position.display_job_id ?? String(position.id ?? applicationUrl),
        title: position.posting_name ?? position.name ?? "Unknown role",
        applicationUrl,
        sourceUrl: applicationUrl,
        postingDate:
          typeof position.t_create === "number"
            ? new Date(position.t_create * 1000)
            : typeof position.t_update === "number"
              ? new Date(position.t_update * 1000)
              : undefined,
        descriptionHtml: position.job_description || undefined,
        locationRaw:
          uniqueStrings([position.location, ...locations]).join(" | ") || position.location || undefined,
        additionalLocations: locations.slice(1),
        remoteTypeHint:
          typeof position.work_location_option === "string"
            ? position.work_location_option
            : position.location_flexibility || undefined,
        metadata: {
          department: position.department,
          businessUnit: position.business_unit,
          locale: position.locale,
          positionId: position.id,
          searchQuery:
            payload.query && typeof payload.query === "object"
              ? (payload.query as Record<string, unknown>).query
              : undefined
        },
        raw: position
      };
    });
}

function cleanHtmlText(value?: string): string | undefined {
  return value ? normalizeWhitespace(decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))) : undefined;
}

function slugifyForUrl(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function externalJobIdFromUrl(value: string): string {
  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean);

  return segments[segments.length - 1] ?? value;
}

function parseShopifyPostings(html: string, baseUrl: string): AdapterFetchedPosting[] {
  const postings: AdapterFetchedPosting[] = [];

  for (const match of html.matchAll(SHOPIFY_JOB_CARD_PATTERN)) {
    const groups = match.groups;

    if (!groups?.href || !groups.title) {
      continue;
    }

    const sourceUrl = toAbsoluteUrl(baseUrl, decodeHtmlEntities(groups.href));
    const title = cleanHtmlText(groups.title);

    if (!title) {
      continue;
    }

    postings.push({
      externalJobId: externalJobIdFromUrl(sourceUrl),
      title,
      applicationUrl: sourceUrl,
      sourceUrl,
      locationRaw: cleanHtmlText(groups.location),
      raw: {
        href: groups.href,
        title,
        location: cleanHtmlText(groups.location)
      }
    });
  }

  return postings;
}

async function fetchShopifyPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const html = await fetchText(context, context.source.sourceUrl);

  return parseShopifyPostings(html, context.source.sourceUrl);
}

function parseBloombergPostings(html: string, baseUrl: string): AdapterFetchedPosting[] {
  const postings: AdapterFetchedPosting[] = [];

  for (const articleMatch of html.matchAll(BLOOMBERG_ARTICLE_PATTERN)) {
    const articleBody = articleMatch.groups?.body;

    if (!articleBody) {
      continue;
    }

    const linkMatch = articleBody.match(BLOOMBERG_LINK_PATTERN);
    const linkGroups = linkMatch?.groups;

    if (!linkGroups?.href || !linkGroups.title) {
      continue;
    }

    const sourceUrl = toAbsoluteUrl(baseUrl, decodeHtmlEntities(linkGroups.href));
    const title = cleanHtmlText(linkGroups.title);

    if (!title) {
      continue;
    }

    const location = cleanHtmlText(articleBody.match(BLOOMBERG_LOCATION_PATTERN)?.groups?.location);

    postings.push({
      externalJobId: externalJobIdFromUrl(sourceUrl),
      title,
      applicationUrl: sourceUrl,
      sourceUrl,
      locationRaw: location,
      raw: {
        href: linkGroups.href,
        title,
        location
      }
    });
  }

  return postings;
}

function buildBloombergSearchUrl(sourceUrl: string, offset: number, pageSize: number): string {
  const url = new URL(sourceUrl);

  url.searchParams.set("jobOffset", String(offset));
  url.searchParams.set("jobRecordsPerPage", String(pageSize));

  if (!url.searchParams.has("keywords")) {
    url.searchParams.set("keywords", "intern");
  }

  return url.toString();
}

async function fetchBloombergPostings(
  context: AdapterFetchContext
): Promise<AdapterFetchedPosting[]> {
  const pageSize = getPositiveNumericConfig(context.source.requestConfigJson?.pageSize, 50);
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 12);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < maxPages; page += 1) {
    const searchUrl = buildBloombergSearchUrl(context.source.sourceUrl, page * pageSize, pageSize);
    const pagePostings = parseBloombergPostings(await fetchText(context, searchUrl), searchUrl);

    if (pagePostings.length === 0) {
      break;
    }

    for (const posting of pagePostings) {
      if (seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    if (pagePostings.length < pageSize) {
      break;
    }
  }

  return postings;
}

function normalizeDeshawPosting(job: DeshawJobEnvelope, baseUrl: string): AdapterFetchedPosting | undefined {
  const data = job.data;
  const externalJobId = data?.id === undefined || data.id === null ? undefined : String(data.id);
  const title = cleanHtmlText(data?.displayName);

  if (!data || !externalJobId || !title) {
    return undefined;
  }

  const sourceUrl = data.jobUrl
    ? toAbsoluteUrl(baseUrl, data.jobUrl)
    : toAbsoluteUrl(baseUrl, `/careers/${slugifyForUrl(title)}-${externalJobId}`);
  const descriptionHtml =
    data.jobDescription?.onCampusDescription ?? data.jobDescription?.websiteDescription;
  const locations = uniqueStrings(
    (data.jobMetadata?.jobLocations ?? [])
      .map((location) => cleanHtmlText(location.name))
      .filter((location): location is string => Boolean(location))
  );

  return {
    externalJobId,
    title,
    applicationUrl: sourceUrl,
    sourceUrl,
    postingDate: data.validFromDate,
    descriptionHtml,
    locationRaw: locations[0],
    additionalLocations: locations.slice(1),
    employmentType: data.hireType?.name,
    metadata: {
      department: data.department?.name,
      jobCategories: (data.jobCategory ?? []).map((entry) => entry.name).filter(Boolean),
      jobSeekerCategories: (data.jobMetadata?.jobSeekerCategories ?? [])
        .map((entry) => entry.name)
        .filter(Boolean)
    },
    raw: data
  };
}

async function fetchDeshawPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const html = await fetchText(context, context.source.sourceUrl);
  const payload = extractNextDataJson<{
    props?: {
      pageProps?: {
        regularJobs?: DeshawJobEnvelope[];
      };
    };
  }>(html);

  return (payload.props?.pageProps?.regularJobs ?? [])
    .map((job) => normalizeDeshawPosting(job, context.source.sourceUrl))
    .filter((posting): posting is AdapterFetchedPosting => Boolean(posting));
}

function parseGResearchPostings(html: string, baseUrl: string): AdapterFetchedPosting[] {
  const postings: AdapterFetchedPosting[] = [];

  for (const match of html.matchAll(GRESEARCH_CARD_PATTERN)) {
    const body = match.groups?.body;
    const href = match.groups?.href;

    if (!body || !href) {
      continue;
    }

    const title = cleanHtmlText(body.match(VACANCY_TITLE_PATTERN)?.groups?.title);
    const sourceUrl = toAbsoluteUrl(baseUrl, decodeHtmlEntities(href));

    if (!title) {
      continue;
    }

    postings.push({
      externalJobId: externalJobIdFromUrl(sourceUrl),
      title,
      applicationUrl: sourceUrl,
      sourceUrl,
      locationRaw: cleanHtmlText(body.match(VACANCY_LOCATION_PATTERN)?.groups?.location),
      raw: {
        href,
        title
      }
    });
  }

  return postings;
}

async function fetchGResearchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 4);
  const seen = new Set<string>();
  const postings: AdapterFetchedPosting[] = [];
  let nextUrl: string | undefined = context.source.sourceUrl;

  for (let page = 0; page < maxPages && nextUrl; page += 1) {
    const html = await fetchText(context, nextUrl);
    const pagePostings = parseGResearchPostings(html, nextUrl);

    for (const posting of pagePostings) {
      if (seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
    }

    const nextHref = html.match(NEXT_PAGE_PATTERN)?.groups?.href;
    nextUrl = nextHref ? toAbsoluteUrl(nextUrl, decodeHtmlEntities(nextHref)) : undefined;
  }

  return postings;
}

function parseTwoSigmaFields(articleBody: string): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const match of articleBody.matchAll(TWO_SIGMA_FIELD_PATTERN)) {
    const label = cleanHtmlText(match.groups?.label);
    const value = cleanHtmlText(match.groups?.value);

    if (label && value) {
      fields[label] = value;
    }
  }

  return fields;
}

function parseTwoSigmaPostings(html: string, baseUrl: string): AdapterFetchedPosting[] {
  const postings: AdapterFetchedPosting[] = [];

  for (const articleMatch of html.matchAll(TWO_SIGMA_ARTICLE_PATTERN)) {
    const articleBody = articleMatch.groups?.body;

    if (!articleBody) {
      continue;
    }

    const linkMatch = articleBody.match(BLOOMBERG_LINK_PATTERN);
    const linkGroups = linkMatch?.groups;

    if (!linkGroups?.href || !linkGroups.title) {
      continue;
    }

    const sourceUrl = toAbsoluteUrl(baseUrl, decodeHtmlEntities(linkGroups.href));
    const title = cleanHtmlText(linkGroups.title);

    if (!title || /^view role$/i.test(title)) {
      continue;
    }

    const fields = parseTwoSigmaFields(articleBody);

    postings.push({
      externalJobId: externalJobIdFromUrl(sourceUrl),
      title,
      applicationUrl: sourceUrl,
      sourceUrl,
      locationRaw: fields.Location,
      employmentType: fields["Experience Level"],
      metadata: {
        function: fields.Function
      },
      raw: {
        href: linkGroups.href,
        title,
        fields
      }
    });
  }

  return postings;
}

async function fetchTwoSigmaPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const html = await fetchText(context, context.source.sourceUrl);

  return parseTwoSigmaPostings(html, context.source.sourceUrl);
}

function parseTalentbrewSearchPostings(html: string, baseUrl: string): AdapterFetchedPosting[] {
  const postings: AdapterFetchedPosting[] = [];

  for (const match of html.matchAll(TALENTBREW_JOB_CARD_PATTERN)) {
    const body = match.groups?.body;

    if (!body) {
      continue;
    }

    const titleMatch = body.match(TALENTBREW_TITLE_PATTERN);
    const groups = titleMatch?.groups;
    const title = cleanHtmlText(groups?.title);
    const href = groups?.href;
    const externalJobId = groups?.jobId;

    if (!title || !href || !externalJobId) {
      continue;
    }

    const sourceUrl = toAbsoluteUrl(baseUrl, decodeHtmlEntities(href));
    const descriptionText = cleanHtmlText(body.match(TALENTBREW_INTRO_PATTERN)?.groups?.intro);

    postings.push({
      externalJobId,
      title,
      applicationUrl: sourceUrl,
      sourceUrl,
      descriptionText,
      locationRaw: cleanHtmlText(body.match(TALENTBREW_LOCATION_PATTERN)?.groups?.location),
      metadata: {
        category: cleanHtmlText(body.match(TALENTBREW_CATEGORY_PATTERN)?.groups?.category)
      },
      raw: {
        href,
        externalJobId,
        title
      }
    });
  }

  return postings;
}

function buildTalentbrewSearchUrl(sourceUrl: string, page: number): string {
  const url = new URL(sourceUrl);

  if (page > 1) {
    url.searchParams.set("p", String(page));
  } else {
    url.searchParams.delete("p");
  }

  return url.toString();
}

async function fetchTalentbrewSearchPostings(
  context: AdapterFetchContext
): Promise<AdapterFetchedPosting[]> {
  const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 4);
  const postings: AdapterFetchedPosting[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page += 1) {
    const searchUrl = buildTalentbrewSearchUrl(context.source.sourceUrl, page);
    const pagePostings = parseTalentbrewSearchPostings(await fetchText(context, searchUrl), searchUrl);

    if (pagePostings.length === 0) {
      break;
    }

    let newCount = 0;

    for (const posting of pagePostings) {
      if (seen.has(posting.externalJobId)) {
        continue;
      }

      seen.add(posting.externalJobId);
      postings.push(posting);
      newCount += 1;
    }

    if (newCount === 0) {
      break;
    }
  }

  return postings;
}

function extractPaylocityPageData(html: string): PaylocityPageData {
  const json = html.match(PAYLOCITY_PAGE_DATA_PATTERN)?.groups?.json;

  if (!json) {
    throw new Error("Unable to find Paylocity pageData payload");
  }

  return JSON.parse(json) as PaylocityPageData;
}

function formatPaylocityLocation(job: PaylocityJob): string | undefined {
  return (
    cleanHtmlText(job.LocationName) ||
    normalizeWhitespace(
      uniqueStrings([job.JobLocation?.City, job.JobLocation?.State, job.JobLocation?.Country]).join(", ")
    ) ||
    undefined
  );
}

function normalizePaylocityPosting(job: PaylocityJob, baseUrl: string): AdapterFetchedPosting | undefined {
  const externalJobId = job.JobId === undefined || job.JobId === null ? undefined : String(job.JobId);
  const title = cleanHtmlText(job.JobTitle);

  if (!externalJobId || !title) {
    return undefined;
  }

  const sourceUrl = toAbsoluteUrl(baseUrl, `/Recruiting/Jobs/Details/${encodeURIComponent(externalJobId)}`);
  const applicationUrl = toAbsoluteUrl(baseUrl, `/Recruiting/Jobs/Apply/${encodeURIComponent(externalJobId)}`);

  return {
    externalJobId,
    title,
    applicationUrl,
    sourceUrl,
    postingDate: job.PublishedDate,
    descriptionHtml: job.Description || undefined,
    locationRaw: formatPaylocityLocation(job),
    remoteTypeHint: job.IsRemote ? "Remote" : undefined,
    metadata: {
      hiringDepartment: job.HiringDepartment
    },
    raw: job
  };
}

async function fetchPaylocityPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
  const html = await fetchText(context, context.source.sourceUrl);
  const pageData = extractPaylocityPageData(html);

  return (pageData.Jobs ?? [])
    .map((job) => normalizePaylocityPosting(job, context.source.sourceUrl))
    .filter((posting): posting is AdapterFetchedPosting => Boolean(posting));
}

export class CustomHtmlAdapter implements SourceAdapter {
  readonly type = "CUSTOM_HTML" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    switch (getParserId(context)) {
      case "apple-search":
        return fetchApplePostings(context);
      case "bloomberg-avature-search":
        return fetchBloombergPostings(context);
      case "deshaw-careers":
        return fetchDeshawPostings(context);
      case "drw-listings":
        return fetchDrwPostings(context);
      case "gresearch-vacancies":
        return fetchGResearchPostings(context);
      case "google-careers-search":
        return fetchGooglePostings(context);
      case "netflix-smartapply-search":
        return fetchNetflixPostings(context);
      case "paylocity-page-data":
        return fetchPaylocityPostings(context);
      case "shopify-careers":
        return fetchShopifyPostings(context);
      case "talentbrew-search":
        return fetchTalentbrewSearchPostings(context);
      case "two-sigma-avature-cards":
        return fetchTwoSigmaPostings(context);
      default:
        return [];
    }
  }
}
