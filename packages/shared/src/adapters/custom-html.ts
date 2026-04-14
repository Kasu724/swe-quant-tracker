import { decodeHtmlEntities, normalizeWhitespace, uniqueStrings } from "../normalization/text";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { fetchText, type SourceAdapter } from "./base";

type CustomHtmlParserId = "apple-search" | "netflix-smartapply-search";

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

const APPLE_CARD_PATTERN =
  /<div id="search-search-job-title-(?<jobKey>[^"]+)-\d+"[\s\S]*?<h3>\s*<a[^>]+href="(?<href>[^"]+)"[^>]*>(?<title>[\s\S]*?)<\/a>\s*<\/h3>[\s\S]*?<span[^>]+class="team-name[^"]*"[^>]*>(?<team>[\s\S]*?)<\/span>[\s\S]*?<span[^>]+class="job-posted-date"[^>]*>(?<postingDate>[\s\S]*?)<\/span>[\s\S]*?<div id="search-location-search-job-title-[^"]+"[\s\S]*?<span id="search-store-name-container-\d+">(?<location>[\s\S]*?)<\/span>/gi;

function getParserId(context: AdapterFetchContext): CustomHtmlParserId {
  const parserId = context.source.parserConfigJson?.parserId;

  if (parserId === "apple-search" || parserId === "netflix-smartapply-search") {
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

function toAbsoluteUrl(baseUrl: string, href: string): string {
  return new URL(href, baseUrl).toString();
}

function parseApplePage(html: string, baseUrl: string): AdapterFetchedPosting[] {
  const postings: AdapterFetchedPosting[] = [];

  for (const match of html.matchAll(APPLE_CARD_PATTERN)) {
    const groups = match.groups;

    if (!groups?.jobKey || !groups.href || !groups.title) {
      continue;
    }

    const title = normalizeWhitespace(decodeHtmlEntities(groups.title));
    const locationRaw = normalizeWhitespace(decodeHtmlEntities(groups.location ?? ""));
    const postingDateRaw = normalizeWhitespace(decodeHtmlEntities(groups.postingDate ?? ""));
    const team = normalizeWhitespace(decodeHtmlEntities(groups.team ?? ""));
    const applicationUrl = toAbsoluteUrl(baseUrl, decodeHtmlEntities(groups.href));

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
        href: groups.href,
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
  }

  return postings;
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

export class CustomHtmlAdapter implements SourceAdapter {
  readonly type = "CUSTOM_HTML" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    switch (getParserId(context)) {
      case "apple-search":
        return fetchApplePostings(context);
      case "netflix-smartapply-search":
        return fetchNetflixPostings(context);
      default:
        return [];
    }
  }
}
