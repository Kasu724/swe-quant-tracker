import { getPostingUrlCandidates, getPreferredPostingUrl } from "@faang-quant/shared";

const DEAD_STATUSES = new Set([404, 410, 451]);
const RESTRICTED_BUT_POSSIBLY_LIVE_STATUSES = new Set([401, 403, 405, 429]);
const DEAD_CONTENT_PATTERNS = [
  /job( posting)?( is)? no longer available/i,
  /position has been filled/i,
  /page not found/i,
  /job does not exist/i,
  /this job is no longer available/i,
  /you can no longer apply/i,
  /the job you are looking for has expired/i
];

type UrlInspection = {
  ok: boolean;
  finalUrl?: string;
  status?: number;
  reason?: string;
};

export async function inspectPostingUrl(url: string): Promise<UrlInspection> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InternshipTrackerBot/1.0)"
      }
    });

    if (response.status === 503) {
      const challengeBody = await response.text();

      if (/captcha|opfcaptcha|automated access|robot check|verify you're not a robot|verify youre not a robot/i.test(challengeBody)) {
        return {
          ok: true,
          finalUrl: response.url || url,
          status: response.status,
          reason: "challenge-503"
        };
      }

      return {
        ok: false,
        finalUrl: response.url || url,
        status: response.status,
        reason: "status-503"
      };
    }

    if (DEAD_STATUSES.has(response.status)) {
      return {
        ok: false,
        finalUrl: response.url || url,
        status: response.status,
        reason: `status-${response.status}`
      };
    }

    if (RESTRICTED_BUT_POSSIBLY_LIVE_STATUSES.has(response.status)) {
      return {
        ok: true,
        finalUrl: response.url || url,
        status: response.status,
        reason: `restricted-${response.status}`
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        finalUrl: response.url || url,
        status: response.status,
        reason: `status-${response.status}`
      };
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (/html|text/i.test(contentType)) {
      const body = (await response.text()).slice(0, 250_000);

      if (DEAD_CONTENT_PATTERNS.some((pattern) => pattern.test(body))) {
        return {
          ok: false,
          finalUrl: response.url || url,
          status: response.status,
          reason: "dead-content"
        };
      }
    }

    return {
      ok: true,
      finalUrl: response.url || url,
      status: response.status
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      reason: error instanceof Error ? error.message : "unknown-error"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveLivePostingUrl(input: {
  sourceUrl?: string | null;
  applicationUrl?: string | null;
}): Promise<string | undefined> {
  const preferredUrl = getPreferredPostingUrl(input);
  const candidates = preferredUrl
    ? [preferredUrl, ...getPostingUrlCandidates(input).filter((url) => url !== preferredUrl)]
    : getPostingUrlCandidates(input);

  for (const candidate of candidates) {
    const inspection = await inspectPostingUrl(candidate);

    if (inspection.ok) {
      return inspection.finalUrl ?? candidate;
    }
  }

  return undefined;
}
