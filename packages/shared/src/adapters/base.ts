import type {
  AdapterFetchContext,
  AdapterFetchedPosting,
  ParsedCompensation,
  SourceTypeValue
} from "../types";
import { normalizeCompensationInterval } from "../normalization/compensation";

export interface SourceAdapter {
  readonly type: SourceTypeValue;
  fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]>;
}

function mergeHeaders(
  baseHeaders: NonNullable<RequestInit["headers"]>,
  extraHeaders?: RequestInit["headers"]
): Headers {
  const headers = new Headers(baseHeaders);

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

export async function fetchJson<T>(context: AdapterFetchContext, url: string): Promise<T> {
  const fetchImpl = context.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    signal: context.signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "faang-quant-tracker/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchJsonRequest<T>(
  context: AdapterFetchContext,
  url: string,
  init?: RequestInit
): Promise<T> {
  const fetchImpl = context.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    ...init,
    signal: context.signal,
    headers: mergeHeaders(
      {
        Accept: "application/json",
        "User-Agent": "faang-quant-tracker/1.0"
      },
      init?.headers
    )
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchText(context: AdapterFetchContext, url: string): Promise<string> {
  const fetchImpl = context.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    signal: context.signal,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "User-Agent": "faang-quant-tracker/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

export function compensationFromStructuredRange(input?: {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
  interval?: string | null;
  raw?: string | null;
}): ParsedCompensation | undefined {
  if (!input) {
    return undefined;
  }

  const min = input.min ?? undefined;
  const max = input.max ?? undefined;

  if (min === undefined && max === undefined && !input.raw) {
    return undefined;
  }

  return {
    raw: input.raw ?? undefined,
    min,
    max,
    currency: input.currency ?? undefined,
    interval: normalizeCompensationInterval(input.interval),
    known: min !== undefined || max !== undefined
  };
}
