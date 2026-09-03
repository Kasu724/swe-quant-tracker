import { readWorkerEnv, type WorkerEnv } from "@swe-quant/config";
import {
  DiscordNotificationStatus,
  prisma,
  type InternshipPosting
} from "@swe-quant/db";
import { getPostingUrlCandidates } from "@swe-quant/shared";
import { logger } from "./logger";

const MAX_DISCORD_RETRY_DELAY_MS = 30_000;
const MAX_ERROR_TEXT_LENGTH = 2_000;

type DiscordPosting = Pick<
  InternshipPosting,
  | "id"
  | "title"
  | "companyNameSnapshot"
  | "locationRaw"
  | "applicationUrl"
  | "sourceUrl"
  | "postingDate"
  | "discoveredAt"
>;

type DiscordWebhookPayload = {
  content: string;
  allowed_mentions: {
    parse: never[];
  };
  embeds: Array<{
    title: string;
    url?: string;
    color: number;
    fields: Array<{
      name: string;
      value: string;
      inline: boolean;
    }>;
    timestamp: string;
  }>;
};

type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type DiscordWebhookClientOptions = {
  webhookUrl: string;
  timeoutMs: number;
  maxRetries: number;
  fetchImpl?: FetchImplementation;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type DiscordWebhookResult = {
  providerMessageId?: string;
  attempts: number;
};

export class DiscordWebhookError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly status?: number
  ) {
    super(message);
    this.name = "DiscordWebhookError";
  }
}

function truncate(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maximumLength - 1))}…`;
}

function toSafeHttpUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatPostingDate(postingDate: Date | null): string {
  return postingDate ? postingDate.toISOString().slice(0, 10) : "Not provided";
}

export function buildDiscordWebhookPayload(posting: DiscordPosting): DiscordWebhookPayload {
  const applicationUrl = getPostingUrlCandidates(posting)
    .map(toSafeHttpUrl)
    .find((candidate): candidate is string => Boolean(candidate));

  return {
    content: "🎓 New internship discovered",
    allowed_mentions: {
      parse: []
    },
    embeds: [
      {
        title: truncate(posting.title, 256),
        ...(applicationUrl ? { url: applicationUrl } : {}),
        color: 0x5865f2,
        fields: [
          {
            name: "Company",
            value: truncate(posting.companyNameSnapshot || "Not provided", 1_024),
            inline: true
          },
          {
            name: "Location",
            value: truncate(posting.locationRaw || "Not provided", 1_024),
            inline: true
          },
          {
            name: "Posting date",
            value: formatPostingDate(posting.postingDate),
            inline: true
          },
          {
            name: "Application",
            value:
              applicationUrl && applicationUrl.length <= 980
                ? `[Open posting](${applicationUrl.replaceAll(")", "%29")})`
                : "Use the linked title above",
            inline: false
          }
        ],
        timestamp: posting.discoveredAt.toISOString()
      }
    ]
  };
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function appendWaitForResponse(webhookUrl: string): string {
  const url = new URL(webhookUrl);
  url.searchParams.set("wait", "true");
  return url.toString();
}

function retryDelayFromHeaders(response: Response): number | undefined {
  const rawValue =
    response.headers.get("retry-after") ?? response.headers.get("x-ratelimit-reset-after");

  if (!rawValue) {
    return undefined;
  }

  const seconds = Number(rawValue);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }

  return Math.min(Math.ceil(seconds * 1_000), MAX_DISCORD_RETRY_DELAY_MS);
}

async function retryDelayForResponse(response: Response, fallbackMs: number): Promise<number> {
  const headerDelay = retryDelayFromHeaders(response);

  if (headerDelay !== undefined) {
    return headerDelay;
  }

  if (response.status === 429) {
    try {
      const body = (await response.clone().json()) as { retry_after?: unknown };
      const seconds = Number(body.retry_after);

      if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(Math.ceil(seconds * 1_000), MAX_DISCORD_RETRY_DELAY_MS);
      }
    } catch {
      // Discord may return an empty or non-JSON rate-limit response.
    }
  }

  return Math.min(fallbackMs, MAX_DISCORD_RETRY_DELAY_MS);
}

async function responseErrorText(response: Response): Promise<string> {
  try {
    const body = truncate((await response.text()).trim(), 500);
    return body ? `Discord webhook returned HTTP ${response.status}: ${body}` : `Discord webhook returned HTTP ${response.status}`;
  } catch {
    return `Discord webhook returned HTTP ${response.status}`;
  }
}

export class DiscordWebhookClient {
  private readonly webhookUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: FetchImplementation;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: DiscordWebhookClientOptions) {
    this.webhookUrl = appendWaitForResponse(options.webhookUrl);
    this.timeoutMs = options.timeoutMs;
    this.maxRetries = options.maxRetries;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async send(payload: DiscordWebhookPayload): Promise<DiscordWebhookResult> {
    const maximumAttempts = this.maxRetries + 1;
    let lastStatus: number | undefined;
    let lastMessage = "Discord webhook request failed";

    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(new Error(`Discord webhook timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs
      );

      try {
        const response = await this.fetchImpl(this.webhookUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "swe-quant-tracker/1.0"
          },
          body: JSON.stringify(payload)
        });

        lastStatus = response.status;

        if (response.ok) {
          let providerMessageId: string | undefined;

          try {
            const responseBody = (await response.json()) as { id?: unknown };
            providerMessageId =
              typeof responseBody.id === "string" ? responseBody.id : undefined;
          } catch {
            // A successful webhook can legitimately return no response body.
          }

          return { providerMessageId, attempts: attempt };
        }

        lastMessage = await responseErrorText(response.clone());
        const retriable = response.status === 408 || response.status === 429 || response.status >= 500;

        if (!retriable || attempt === maximumAttempts) {
          throw new DiscordWebhookError(lastMessage, attempt, response.status);
        }

        const fallbackMs = 500 * 2 ** (attempt - 1);
        await this.sleep(await retryDelayForResponse(response, fallbackMs));
      } catch (error) {
        if (error instanceof DiscordWebhookError) {
          throw error;
        }

        lastMessage = error instanceof Error ? error.message : "Discord webhook request failed";

        if (attempt === maximumAttempts) {
          throw new DiscordWebhookError(lastMessage, attempt, lastStatus);
        }

        await this.sleep(Math.min(500 * 2 ** (attempt - 1), MAX_DISCORD_RETRY_DELAY_MS));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new DiscordWebhookError(lastMessage, maximumAttempts, lastStatus);
  }
}

export function outboxRetryDelay(attempts: number): number {
  return Math.min(5 * 60_000 * 2 ** Math.max(0, attempts - 1), 6 * 60 * 60_000);
}

function leaseDuration(env: WorkerEnv): number {
  const maximumAttemptDuration = env.DISCORD_WEBHOOK_TIMEOUT_MS + MAX_DISCORD_RETRY_DELAY_MS;
  return Math.max(60_000, maximumAttemptDuration * (env.DISCORD_MAX_RETRIES + 1) + 30_000);
}

export type DiscordDeliveryConfiguration = {
  webhookUrl: string;
  /** null means the legacy environment webhook, which historically announced every company. */
  companyIds: string[] | null;
};

export async function readDiscordDeliveryConfiguration(
  env: WorkerEnv
): Promise<DiscordDeliveryConfiguration | null> {
  // The destination is stored per local profile. Keeping the secret in the
  // database means the web settings page can own setup without requiring a
  // worker restart or a process-wide webhook environment variable.
  const destinationDelegate = (
    prisma as typeof prisma & {
      discordDestination?: {
        findFirst: (args: unknown) => Promise<{
          webhookUrl: string;
          enabled: boolean;
          companies: Array<{ companyId: string }>;
        } | null>;
      };
    }
  ).discordDestination;

  if (destinationDelegate) {
    const destination = await destinationDelegate.findFirst({
      include: {
        companies: {
          select: { companyId: true }
        }
      }
    });

    // An explicitly saved destination, including a paused or unselected one,
    // takes precedence over the legacy environment fallback.
    if (destination) {
      if (!destination.enabled || !destination.webhookUrl || destination.companies.length === 0) {
        return null;
      }

      return {
        webhookUrl: destination.webhookUrl,
        companyIds: destination.companies.map((company) => company.companyId)
      };
    }
  }

  if (!env.DISCORD_WEBHOOK_URL) {
    return null;
  }

  return {
    webhookUrl: env.DISCORD_WEBHOOK_URL,
    companyIds: null
  };
}

export async function deliverPendingDiscordNotifications(
  env: WorkerEnv,
  options: {
    client?: Pick<DiscordWebhookClient, "send">;
    now?: () => Date;
  } = {}
): Promise<void> {
  const configuration = await readDiscordDeliveryConfiguration(env);

  if (!configuration) {
    return;
  }

  const queryTime = options.now?.() ?? new Date();
  const candidates = await prisma.discordNotification.findMany({
    where: {
      eligibleForDelivery: true,
      ...(configuration.companyIds
        ? {
            internshipPosting: {
              companyId: { in: configuration.companyIds }
            }
          }
        : {}),
      OR: [
        {
          status: { in: [DiscordNotificationStatus.PENDING, DiscordNotificationStatus.FAILED] },
          nextAttemptAt: { lte: queryTime }
        },
        {
          status: DiscordNotificationStatus.PROCESSING,
          leaseExpiresAt: { lte: queryTime }
        }
      ]
    },
    include: {
      internshipPosting: true
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: env.DISCORD_NOTIFICATION_BATCH_SIZE
  });

  if (candidates.length === 0) {
    return;
  }

  const client =
    options.client ??
    new DiscordWebhookClient({
      webhookUrl: configuration.webhookUrl,
      timeoutMs: env.DISCORD_WEBHOOK_TIMEOUT_MS,
      maxRetries: env.DISCORD_MAX_RETRIES
    });
  for (const candidate of candidates) {
    const claimTime = options.now?.() ?? new Date();
    const claimed = await prisma.discordNotification.updateMany({
      where: {
        id: candidate.id,
        OR: [
          {
            status: { in: [DiscordNotificationStatus.PENDING, DiscordNotificationStatus.FAILED] },
            nextAttemptAt: { lte: claimTime }
          },
          {
            status: DiscordNotificationStatus.PROCESSING,
            leaseExpiresAt: { lte: claimTime }
          }
        ]
      },
      data: {
        status: DiscordNotificationStatus.PROCESSING,
        leaseExpiresAt: new Date(claimTime.getTime() + leaseDuration(env)),
        attempts: { increment: 1 },
        lastError: null
      }
    });

    if (claimed.count !== 1) {
      continue;
    }

    try {
      const result = await client.send(buildDiscordWebhookPayload(candidate.internshipPosting));
      const completedAt = options.now?.() ?? new Date();
      await prisma.discordNotification.update({
        where: { id: candidate.id },
        data: {
          status: DiscordNotificationStatus.SENT,
          sentAt: completedAt,
          leaseExpiresAt: null,
          providerMessageId: result.providerMessageId,
          lastError: null
        }
      });

      logger.info(
        {
          postingId: candidate.internshipPostingId,
          attempts: result.attempts
        },
        "Discord internship notification sent"
      );
    } catch (error) {
      const failedAt = options.now?.() ?? new Date();
      const message = truncate(
        error instanceof Error ? error.message : "Unknown Discord notification error",
        MAX_ERROR_TEXT_LENGTH
      );
      const totalAttempts = candidate.attempts + 1;

      await prisma.discordNotification.update({
        where: { id: candidate.id },
        data: {
          status: DiscordNotificationStatus.FAILED,
          nextAttemptAt: new Date(failedAt.getTime() + outboxRetryDelay(totalAttempts)),
          leaseExpiresAt: null,
          lastError: message
        }
      });

      logger.error(
        {
          error,
          postingId: candidate.internshipPostingId,
          nextAttemptInMs: outboxRetryDelay(totalAttempts)
        },
        "Discord internship notification failed; it will be retried"
      );
    }
  }
}

let discordCycleChain: Promise<void> = Promise.resolve();

/**
 * Serialize all cycle entry points (scheduler, CLI, and ingestion-triggered)
 * within this worker process. Outbox leases still protect against a second
 * worker process, while this avoids needless concurrent scans and webhook
 * sends in the common single-worker deployment.
 */
export function runDiscordNotificationCycle(): Promise<void> {
  discordCycleChain = discordCycleChain.then(async () => {
    try {
      const env = readWorkerEnv();
      await deliverPendingDiscordNotifications(env);
    } catch (error) {
      logger.error(
        { error },
        "Discord notification cycle failed"
      );
    }
  });

  return discordCycleChain;
}
