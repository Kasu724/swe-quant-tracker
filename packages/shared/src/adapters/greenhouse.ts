import { parseCompensation } from "../normalization/compensation";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import { fetchJson, type SourceAdapter } from "./base";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  offices?: Array<{ name?: string }>;
  departments?: Array<{ name?: string }>;
  content?: string;
  metadata?: Array<{ name?: string; value?: string | null }>;
};

type GreenhouseResponse = {
  jobs: GreenhouseJob[];
};

function buildGreenhouseUrl(context: AdapterFetchContext): string {
  return (
    context.source.sourceUrl ||
    `https://boards-api.greenhouse.io/v1/boards/${context.source.sourceIdentifier}/jobs?content=true`
  );
}

function extractPayRaw(job: GreenhouseJob): string | undefined {
  const payField = job.metadata?.find((field) =>
    /(salary|compensation|pay)/i.test(field.name ?? "")
  );

  return payField?.value ?? undefined;
}

export class GreenhouseAdapter implements SourceAdapter {
  readonly type = "GREENHOUSE" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    const response = await fetchJson<GreenhouseResponse>(context, buildGreenhouseUrl(context));

    return response.jobs.map((job) => {
      const payRaw = extractPayRaw(job);

      return {
        externalJobId: String(job.id),
        title: job.title,
        applicationUrl: job.absolute_url,
        sourceUrl: job.absolute_url,
        postingDate: job.updated_at,
        descriptionHtml: job.content,
        locationRaw:
          job.location?.name ??
          job.offices?.map((office) => office.name).filter(Boolean).join(" | ") ??
          undefined,
        payRaw,
        compensation: payRaw ? parseCompensation(payRaw) : undefined,
        metadata: {
          departments: job.departments?.map((department) => department.name).filter(Boolean),
          offices: job.offices?.map((office) => office.name).filter(Boolean),
          metadata: job.metadata
        },
        raw: job
      };
    });
  }
}

