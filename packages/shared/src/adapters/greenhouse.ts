import { parseCompensation } from "../normalization/compensation";
import type { AdapterFetchContext, AdapterFetchedPosting } from "../types";
import {
  compensationFromStructuredRange,
  fetchJson,
  type SourceAdapter
} from "./base";

type GreenhouseStructuredCurrencyRange = {
  unit?: string | null;
  min_value?: string | number | null;
  max_value?: string | number | null;
};

type GreenhouseMetadataField = {
  name?: string;
  value?: string | GreenhouseStructuredCurrencyRange | null;
};

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  offices?: Array<{ name?: string }>;
  departments?: Array<{ name?: string }>;
  content?: string;
  metadata?: GreenhouseMetadataField[];
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

function findPayField(job: GreenhouseJob): GreenhouseMetadataField | undefined {
  return job.metadata?.find((field) => /(salary|compensation|pay)/i.test(field.name ?? ""));
}

function asNumber(value: string | number | null | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function formatStructuredPayRaw(value: GreenhouseStructuredCurrencyRange): string | undefined {
  const min = asNumber(value.min_value);
  const max = asNumber(value.max_value);
  const currency = value.unit ?? undefined;

  if (min === undefined && max === undefined) {
    return undefined;
  }

  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  });
  const formattedMin = min !== undefined ? formatter.format(min) : undefined;
  const formattedMax = max !== undefined ? formatter.format(max) : undefined;

  if (formattedMin && formattedMax && formattedMin !== formattedMax) {
    return currency ? `${currency} ${formattedMin} - ${formattedMax}` : `${formattedMin} - ${formattedMax}`;
  }

  const formatted = formattedMin ?? formattedMax;

  return formatted ? (currency ? `${currency} ${formatted}` : formatted) : undefined;
}

function extractPayRaw(job: GreenhouseJob): string | undefined {
  const payField = findPayField(job);

  if (!payField) {
    return undefined;
  }

  if (typeof payField.value === "string") {
    return payField.value;
  }

  if (payField.value && typeof payField.value === "object") {
    return formatStructuredPayRaw(payField.value);
  }

  return undefined;
}

function extractStructuredCompensation(job: GreenhouseJob) {
  const payField = findPayField(job);

  if (!payField?.value || typeof payField.value !== "object") {
    return undefined;
  }

  return compensationFromStructuredRange({
    min: asNumber(payField.value.min_value),
    max: asNumber(payField.value.max_value),
    currency: payField.value.unit,
    interval: payField.name && /hour/i.test(payField.name) ? "1 HOUR" : "1 YEAR",
    raw: formatStructuredPayRaw(payField.value)
  });
}

function extractCompensation(job: GreenhouseJob, payRaw?: string) {
  const payField = job.metadata?.find((field) =>
    /(salary|compensation|pay)/i.test(field.name ?? "")
  );

  if (payField?.value && typeof payField.value === "object") {
    return extractStructuredCompensation(job);
  }

  return payRaw ? parseCompensation(payRaw) : undefined;
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
        compensation: extractCompensation(job, payRaw),
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
