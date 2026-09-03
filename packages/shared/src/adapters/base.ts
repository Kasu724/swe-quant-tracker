import type {
  AdapterFetchContext,
  AdapterFetchedPosting,
  ParsedCompensation,
  SourceTypeValue
} from "../types";
import { normalizeCompensationInterval } from "../normalization/compensation";

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
export const DEFAULT_DETAIL_CONCURRENCY = 5;
export const MAX_DETAIL_CONCURRENCY = 10;

export interface SourceAdapter {
  readonly type: SourceTypeValue;
  fetchPostings(context: AdapterFetchContext): Promise<AdapterFetchedPosting[]>;
}

export class FetchTimeoutError extends Error {
  constructor(
    readonly url: string,
    readonly timeoutMs: number
  ) {
    super(`Fetch timed out after ${timeoutMs}ms: ${url}`);
    this.name = "FetchTimeoutError";
  }
}

function readPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function getRequestTimeoutMs(context: AdapterFetchContext): number {
  return (
    readPositiveNumber(context.source.requestConfigJson?.requestTimeoutMs) ??
    readPositiveNumber(context.requestTimeoutMs) ??
    DEFAULT_REQUEST_TIMEOUT_MS
  );
}

function abortReasonToError(reason: unknown, fallbackMessage: string): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof reason === "string" && reason.trim()) {
    return new Error(reason);
  }

  return new Error(fallbackMessage);
}

function clampDetailConcurrency(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DETAIL_CONCURRENCY;
  }

  return Math.min(Math.max(1, Math.floor(parsed)), MAX_DETAIL_CONCURRENCY);
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: unknown,
  mapper: (item: T, index: number) => Promise<R> | R
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  const nextIndex = { value: 0 };
  const workerCount = Math.min(clampDetailConcurrency(concurrency), items.length);

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex.value;
      nextIndex.value += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

async function fetchWithTimeout(
  context: AdapterFetchContext,
  url: string,
  init?: RequestInit
): Promise<Response> {
  const fetchImpl = context.fetchImpl ?? fetch;
  const timeoutMs = getRequestTimeoutMs(context);
  const controller = new AbortController();
  let removeContextAbortListener: (() => void) | undefined;
  let removeRequestAbortListener: (() => void) | undefined;

  if (context.signal) {
    if (context.signal.aborted) {
      controller.abort(context.signal.reason);
    } else {
      const onContextAbort = () => controller.abort(context.signal?.reason);
      context.signal.addEventListener("abort", onContextAbort, { once: true });
      removeContextAbortListener = () => context.signal?.removeEventListener("abort", onContextAbort);
      if (context.signal.aborted) {
        controller.abort(context.signal.reason);
      }
    }
  }

  const timeout = setTimeout(() => {
    controller.abort(new FetchTimeoutError(url, timeoutMs));
  }, timeoutMs);

  const abortPromise = new Promise<Response>((_, reject) => {
    const onRequestAbort = () => {
      reject(abortReasonToError(controller.signal.reason, `Fetch aborted: ${url}`));
    };

    if (controller.signal.aborted) {
      onRequestAbort();
      return;
    }

    controller.signal.addEventListener("abort", onRequestAbort, { once: true });
    removeRequestAbortListener = () =>
      controller.signal.removeEventListener("abort", onRequestAbort);
  });

  try {
    return await Promise.race([
      fetchImpl(url, {
        ...init,
        signal: controller.signal
      }),
      abortPromise
    ]);
  } finally {
    clearTimeout(timeout);
    removeContextAbortListener?.();
    removeRequestAbortListener?.();
  }
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
  const response = await fetchWithTimeout(context, url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "swe-quant-tracker/1.0"
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
  const response = await fetchWithTimeout(context, url, {
    ...init,
    headers: mergeHeaders(
      {
        Accept: "application/json",
        "User-Agent": "swe-quant-tracker/1.0"
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
  const response = await fetchWithTimeout(context, url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "User-Agent": "swe-quant-tracker/1.0"
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
