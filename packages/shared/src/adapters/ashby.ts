import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { compensationFromStructuredRange, type SourceAdapter, fetchJson } from "./base";

type AshbyCompensationComponent = {
  compensationType?: string;
  interval?: string;
  currencyCode?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
};

type AshbyJob = {
  id?: string;
  title: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }>;
  department?: string;
  team?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  employmentType?: string;
  jobUrl?: string;
  applyUrl?: string;
  compensation?: {
    compensationTierSummary?: string;
    scrapeableCompensationSalarySummary?: string;
    summaryComponents?: AshbyCompensationComponent[];
  };
};

type AshbyResponse = {
  jobs: AshbyJob[];
};

function buildAshbyUrl(board: string): string {
  return `https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`;
}

function extractStructuredCompensation(job: AshbyJob) {
  const salaryComponent = job.compensation?.summaryComponents?.find((component) =>
    /(salary|hourly)/i.test(component.compensationType ?? "")
  );

  return compensationFromStructuredRange({
    min: salaryComponent?.minValue,
    max: salaryComponent?.maxValue,
    currency: salaryComponent?.currencyCode,
    interval: salaryComponent?.interval,
    raw:
      job.compensation?.scrapeableCompensationSalarySummary ??
      job.compensation?.compensationTierSummary
  });
}

export class AshbyAdapter implements SourceAdapter {
  readonly type = "ASHBY" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    const response = await fetchJson<AshbyResponse>(
      context,
      buildAshbyUrl(context.source.sourceIdentifier)
    );

    return response.jobs
      .filter((job) => job.isListed !== false)
      .map((job) => ({
        externalJobId: job.id ?? `${job.title}-${job.jobUrl ?? job.applyUrl ?? ""}`,
        title: job.title,
        applicationUrl: job.applyUrl ?? job.jobUrl ?? "",
        sourceUrl: job.jobUrl,
        postingDate: job.publishedAt,
        descriptionHtml: job.descriptionHtml,
        descriptionText: job.descriptionPlain,
        employmentType: job.employmentType,
        locationRaw: job.location,
        additionalLocations: job.secondaryLocations?.map((location) => location.location ?? "").filter(Boolean),
        remoteTypeHint: job.workplaceType ?? (job.isRemote ? "Remote" : undefined),
        payRaw:
          job.compensation?.scrapeableCompensationSalarySummary ??
          job.compensation?.compensationTierSummary,
        compensation: extractStructuredCompensation(job),
        metadata: {
          department: job.department,
          team: job.team
        },
        raw: job
      }));
  }
}

