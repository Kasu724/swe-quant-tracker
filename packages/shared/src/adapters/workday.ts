import { normalizeWhitespace, stripHtml } from "../normalization/text";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { fetchJsonRequest, type SourceAdapter } from "./base";

type WorkdaySearchResponse = {
  total?: number;
  jobPostings?: WorkdaySearchPosting[];
};

type WorkdaySearchPosting = {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
};

type WorkdayJobDetailResponse = {
  jobPostingInfo?: WorkdayJobPostingInfo;
};

type WorkdayJobPostingInfo = {
  title?: string;
  jobDescription?: string;
  location?: string;
  postedOn?: string;
  startDate?: string;
  timeType?: string;
  jobReqId?: string;
  jobPostingId?: string;
  externalUrl?: string;
  canApply?: boolean;
  posted?: boolean;
  country?: {
    descriptor?: string;
    id?: string;
  };
  jobRequisitionLocation?: {
    descriptor?: string;
    country?: {
      descriptor?: string;
      id?: string;
      alpha2Code?: string;
    };
  };
};

type WorkdayAppliedFacets = Record<string, string[]>;

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

function getStringConfig(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getAppliedFacets(value: unknown): WorkdayAppliedFacets | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const facets = Object.entries(value).reduce<WorkdayAppliedFacets>((accumulator, [key, raw]) => {
    if (!Array.isArray(raw)) {
      return accumulator;
    }

    const values = raw.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);

    if (values.length > 0) {
      accumulator[key] = values;
    }

    return accumulator;
  }, {});

  return Object.keys(facets).length > 0 ? facets : undefined;
}

function parseRelativePostedOn(raw?: string): Date | undefined {
  if (!raw) {
    return undefined;
  }

  const text = normalizeWhitespace(raw);

  if (/posted today/i.test(text)) {
    return new Date();
  }

  if (/posted yesterday/i.test(text)) {
    return new Date(Date.now() - 24 * 60 * 60 * 1_000);
  }

  const match = text.match(/posted\s+(\d+)(\+)?\s+days?\s+ago/i);

  if (!match) {
    return undefined;
  }

  const days = Number(match[1]);

  if (!Number.isFinite(days)) {
    return undefined;
  }

  return new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
}

function buildSearchBody(context: AdapterFetchContext, limit: number, offset: number) {
  const searchText = getStringConfig(context.source.requestConfigJson?.searchText, "");
  const appliedFacets = getAppliedFacets(context.source.requestConfigJson?.appliedFacets);

  return {
    limit,
    offset,
    ...(searchText ? { searchText } : {}),
    ...(appliedFacets ? { appliedFacets } : {})
  };
}

function buildDetailUrl(sourceUrl: string, externalPath: string): string {
  if (/^https?:\/\//i.test(externalPath)) {
    return externalPath;
  }

  const url = new URL(sourceUrl);
  const basePath = url.pathname.replace(/\/jobs\/?$/, "");

  return `${url.origin}${basePath}${externalPath.startsWith("/") ? externalPath : `/${externalPath}`}`;
}

function extractPaySnippet(descriptionHtml?: string): string | undefined {
  if (!descriptionHtml) {
    return undefined;
  }

  const text = stripHtml(descriptionHtml);
  const sentences = text.split(/(?<=[.?!])\s+/);

  return sentences.find(
    (sentence) =>
      /\b(rate|salary|compensation)\b/i.test(sentence) &&
      /(?:USD|GBP|EUR|CAD|\$|£|€)/i.test(sentence)
  );
}

function normalizeWorkdayPosting(
  summary: WorkdaySearchPosting,
  detail: WorkdayJobPostingInfo,
  detailUrl: string
): AdapterFetchedPosting | undefined {
  const title = normalizeWhitespace(detail.title || summary.title || "");
  const sourceUrl = detail.externalUrl || detailUrl;
  const applicationUrl = detail.externalUrl || detailUrl;
  const externalJobId =
    detail.jobReqId ||
    summary.bulletFields?.[0] ||
    detail.jobPostingId ||
    summary.externalPath?.split("_").at(-1);
  const locationRaw = normalizeWhitespace(detail.location || summary.locationsText || "");

  if (!title || !externalJobId || !applicationUrl) {
    return undefined;
  }

  return {
    externalJobId,
    title,
    applicationUrl,
    sourceUrl,
    postingDate: detail.startDate || parseRelativePostedOn(detail.postedOn || summary.postedOn),
    descriptionHtml: detail.jobDescription || undefined,
    employmentType: detail.timeType || undefined,
    locationRaw: locationRaw || undefined,
    payRaw: extractPaySnippet(detail.jobDescription),
    metadata: {
      canApply: detail.canApply,
      country: detail.jobRequisitionLocation?.country?.descriptor ?? detail.country?.descriptor,
      countryCode: detail.jobRequisitionLocation?.country?.alpha2Code,
      jobPostingId: detail.jobPostingId,
      posted: detail.posted,
      postedOn: detail.postedOn || summary.postedOn
    },
    raw: {
      summary,
      detail
    }
  };
}

export class WorkdayAdapter implements SourceAdapter {
  readonly type = "WORKDAY" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    const pageSize = Math.min(getNumericConfig(context.source.requestConfigJson?.pageSize, 20), 20);
    const maxPages = getNumericConfig(context.source.requestConfigJson?.maxPages, 10);
    const postings: AdapterFetchedPosting[] = [];
    const seen = new Set<string>();
    let offset = 0;
    let page = 0;
    let total = Number.POSITIVE_INFINITY;

    while (page < maxPages && offset < total) {
      const response = await fetchJsonRequest<WorkdaySearchResponse>(context, context.source.sourceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildSearchBody(context, pageSize, offset))
      });
      const summaries = response.jobPostings ?? [];

      total = typeof response.total === "number" ? response.total : total;

      if (summaries.length === 0) {
        break;
      }

      for (const summary of summaries) {
        if (!summary.externalPath) {
          continue;
        }

        const detailUrl = buildDetailUrl(context.source.sourceUrl, summary.externalPath);
        const detailResponse = await fetchJsonRequest<WorkdayJobDetailResponse>(context, detailUrl);
        const detail = detailResponse.jobPostingInfo;

        if (!detail) {
          continue;
        }

        const posting = normalizeWorkdayPosting(summary, detail, detailUrl);

        if (!posting || seen.has(posting.externalJobId)) {
          continue;
        }

        seen.add(posting.externalJobId);
        postings.push(posting);
      }

      if (summaries.length < pageSize) {
        break;
      }

      offset += summaries.length;
      page += 1;
    }

    return postings;
  }
}
