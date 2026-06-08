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
  value?: string | boolean | GreenhouseStructuredCurrencyRange | null;
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

type GreenhouseMetadataFieldFilters = Record<string, string | string[]>;

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

function getMetadataFieldFilters(value: unknown): GreenhouseMetadataFieldFilters | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const filters = Object.entries(value).reduce<GreenhouseMetadataFieldFilters>(
    (accumulator, [fieldName, raw]) => {
      if (typeof raw === "string" && raw.trim()) {
        accumulator[fieldName] = raw;
      }

      if (Array.isArray(raw)) {
        const values = raw.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);

        if (values.length > 0) {
          accumulator[fieldName] = values;
        }
      }

      return accumulator;
    },
    {}
  );

  return Object.keys(filters).length > 0 ? filters : undefined;
}

function metadataValueToStrings(value: GreenhouseMetadataField["value"]): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (value && typeof value === "object") {
    return [value.unit, value.min_value, value.max_value]
      .map((entry) => (entry === undefined || entry === null ? "" : String(entry)))
      .filter(Boolean);
  }

  if (typeof value === "boolean") {
    return [String(value)];
  }

  return [];
}

function matchesMetadataFilters(job: GreenhouseJob, filters?: GreenhouseMetadataFieldFilters): boolean {
  if (!filters) {
    return true;
  }

  return Object.entries(filters).every(([fieldName, expectedRaw]) => {
    const expectedValues = (Array.isArray(expectedRaw) ? expectedRaw : [expectedRaw]).map((value) =>
      value.toLowerCase()
    );
    const matchingFields = job.metadata?.filter(
      (field) => field.name?.toLowerCase() === fieldName.toLowerCase()
    ) ?? [];

    return matchingFields.some((field) =>
      metadataValueToStrings(field.value).some((value) =>
        expectedValues.includes(value.toLowerCase())
      )
    );
  });
}

export class GreenhouseAdapter implements SourceAdapter {
  readonly type = "GREENHOUSE" as const;

  async fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]> {
    const response = await fetchJson<GreenhouseResponse>(context, buildGreenhouseUrl(context));
    const metadataFieldFilters = getMetadataFieldFilters(
      context.source.requestConfigJson?.metadataFieldFilters
    );

    return response.jobs.filter((job) => matchesMetadataFilters(job, metadataFieldFilters)).map((job) => {
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
