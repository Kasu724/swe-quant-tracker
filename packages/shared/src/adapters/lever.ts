import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { compensationFromStructuredRange, fetchJson, type SourceAdapter } from "./base";

type LeverPosting = {
  id: string;
  text: string;
  createdAt?: number;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
  };
  description?: string;
  descriptionPlain?: string;
  salaryDescription?: string;
  salaryRange?: {
    min?: number | null;
    max?: number | null;
    currency?: string | null;
    interval?: string | null;
  };
  workplaceType?: string;
  urls?: {
    show?: string;
    apply?: string;
    list?: string;
  };
  hostedUrl?: string;
  applyUrl?: string;
  country?: string;
  tags?: string[];
};

function buildLeverUrl(site: string, limit: number, skip: number): string {
  return `https://api.lever.co/v0/postings/${site}?mode=json&limit=${limit}&skip=${skip}`;
}

export class LeverAdapter implements SourceAdapter {
  readonly type = "LEVER" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    const limit = Number(context.source.requestConfigJson?.limit ?? 100);
    const postings: LeverPosting[] = [];
    let skip = 0;

    while (true) {
      const batch = await fetchJson<LeverPosting[]>(
        context,
        buildLeverUrl(context.source.sourceIdentifier, limit, skip)
      );

      postings.push(...batch);

      if (batch.length < limit) {
        break;
      }

      skip += limit;
    }

    return postings.map((posting) => ({
      externalJobId: posting.id,
      title: posting.text,
      applicationUrl: posting.applyUrl ?? posting.urls?.apply ?? posting.urls?.show ?? "",
      sourceUrl: posting.hostedUrl ?? posting.urls?.show,
      postingDate: posting.createdAt ? new Date(posting.createdAt) : undefined,
      descriptionHtml: posting.description,
      descriptionText: posting.descriptionPlain,
      employmentType: posting.categories?.commitment ?? undefined,
      locationRaw: posting.categories?.location ?? undefined,
      remoteTypeHint: posting.workplaceType,
      payRaw: posting.salaryDescription ?? undefined,
      compensation: compensationFromStructuredRange({
        min: posting.salaryRange?.min,
        max: posting.salaryRange?.max,
        currency: posting.salaryRange?.currency,
        interval: posting.salaryRange?.interval,
        raw: posting.salaryDescription
      }),
      metadata: {
        department: posting.categories?.department,
        team: posting.categories?.team,
        country: posting.country,
        tags: posting.tags
      },
      raw: posting
    }));
  }
}

