import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMany: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  readWorkerEnv: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
  loggerDebug: vi.fn()
}));

vi.mock("@faang-quant/config", () => ({
  readWorkerEnv: mocks.readWorkerEnv
}));

vi.mock("@faang-quant/db", () => ({
  DiscordNotificationStatus: {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    SENT: "SENT",
    FAILED: "FAILED"
  },
  prisma: {
    discordNotification: {
      createMany: mocks.createMany,
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
      update: mocks.update
    }
  }
}));

vi.mock("../src/lib/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
    debug: mocks.loggerDebug
  }
}));

import {
  buildDiscordWebhookPayload,
  deliverPendingDiscordNotifications,
  DiscordWebhookClient,
  DiscordWebhookError,
  outboxRetryDelay,
  queueDiscordNotifications,
  runDiscordNotificationCycle
} from "../src/lib/discord";

const baseEnv = {
  DATABASE_URL: "postgresql://localhost/test",
  APP_BASE_URL: "http://localhost:3000",
  EMAIL_FROM: "test@example.com",
  EMAIL_PROVIDER: "console",
  LISTING_NEW_DAYS: 7,
  POSTING_STALE_DAYS: 7,
  POLL_CRON: "*/30 * * * *",
  DAILY_DIGEST_CRON: "0 8 * * *",
  INGESTION_CONCURRENCY: 2,
  INGESTION_REQUEST_TIMEOUT_MS: 20_000,
  INGESTION_SOURCE_TIMEOUT_MS: 120_000,
  DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
  DISCORD_WEBHOOK_TIMEOUT_MS: 100,
  DISCORD_MAX_RETRIES: 2,
  DISCORD_NOTIFICATION_BATCH_SIZE: 25
};

const posting = {
  id: "posting-1",
  title: "Quantitative Research Intern",
  companyNameSnapshot: "Example Capital",
  locationRaw: "New York, NY",
  applicationUrl: "https://example.com/apply",
  sourceUrl: "https://example.com/job",
  postingDate: new Date("2026-08-10T00:00:00.000Z"),
  discoveredAt: new Date("2026-08-12T12:00:00.000Z")
};

describe("DiscordWebhookClient", () => {
  it.each([
    new Response(null, { status: 204 }),
    new Response("not-json", { status: 200 })
  ])("accepts successful responses without a valid JSON body", async (response) => {
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const client = new DiscordWebhookClient({
      webhookUrl: baseEnv.DISCORD_WEBHOOK_URL,
      timeoutMs: 100,
      maxRetries: 0,
      fetchImpl
    });

    await expect(client.send(buildDiscordWebhookPayload(posting))).resolves.toEqual({
      providerMessageId: undefined,
      attempts: 1
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("wait=true");
  });

  it("does not retry a permanent client error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    const sleep = vi.fn();
    const client = new DiscordWebhookClient({
      webhookUrl: baseEnv.DISCORD_WEBHOOK_URL,
      timeoutMs: 100,
      maxRetries: 3,
      fetchImpl,
      sleep
    });

    await expect(client.send(buildDiscordWebhookPayload(posting))).rejects.toMatchObject({
      name: "DiscordWebhookError",
      status: 400,
      attempts: 1
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("honors Discord's JSON retry_after value for rate limits", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ retry_after: 0.025 }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "discord-message-id" }), { status: 200 })
      );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = new DiscordWebhookClient({
      webhookUrl: baseEnv.DISCORD_WEBHOOK_URL,
      timeoutMs: 100,
      maxRetries: 1,
      fetchImpl,
      sleep
    });

    await expect(client.send(buildDiscordWebhookPayload(posting))).resolves.toEqual({
      providerMessageId: "discord-message-id",
      attempts: 2
    });
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it.each(["network", "server"])("retries a transient %s failure", async (failure) => {
    const firstResult =
      failure === "network"
        ? Promise.reject(new Error("connection reset"))
        : Promise.resolve(new Response("unavailable", { status: 503 }));
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => firstResult)
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = new DiscordWebhookClient({
      webhookUrl: baseEnv.DISCORD_WEBHOOK_URL,
      timeoutMs: 100,
      maxRetries: 1,
      fetchImpl,
      sleep
    });

    await expect(client.send(buildDiscordWebhookPayload(posting))).resolves.toMatchObject({
      attempts: 2
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("times out a webhook request and reports the final attempt", async () => {
    const fetchImpl = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true
          });
        })
    );
    const client = new DiscordWebhookClient({
      webhookUrl: baseEnv.DISCORD_WEBHOOK_URL,
      timeoutMs: 1,
      maxRetries: 0,
      fetchImpl
    });

    await expect(client.send(buildDiscordWebhookPayload(posting))).rejects.toEqual(
      expect.objectContaining<Partial<DiscordWebhookError>>({
        name: "DiscordWebhookError",
        attempts: 1
      })
    );
  });
});

describe("Discord payload", () => {
  it("sanitizes unsafe URLs, truncates fields, preserves UTF-8, and disables mentions", () => {
    const payload = buildDiscordWebhookPayload({
      ...posting,
      title: "I".repeat(300),
      sourceUrl: "javascript:alert(1)"
    });

    expect(payload.content).toBe("🎓 New internship discovered");
    expect(payload.allowed_mentions.parse).toEqual([]);
    expect(payload.embeds[0]?.url).toBe("https://example.com/apply");
    expect(payload.embeds[0]?.title).toHaveLength(256);
    expect(payload.embeds[0]?.title.endsWith("…")).toBe(true);
    expect(payload.embeds[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Company", value: "Example Capital" }),
        expect.objectContaining({ name: "Location", value: "New York, NY" }),
        expect.objectContaining({ name: "Posting date", value: "2026-08-10" }),
        expect.objectContaining({
          name: "Application",
          value: "[Open posting](https://example.com/apply)"
        })
      ])
    );
  });
});

describe("Discord notification outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMany.mockResolvedValue({ count: 0 });
    mocks.findMany.mockResolvedValue([]);
  });

  it("queues unique posting IDs without attempting delivery", async () => {
    await expect(queueDiscordNotifications(["posting-1", "posting-1", "posting-2"])).resolves.toBeUndefined();

    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        { internshipPostingId: "posting-1" },
        { internshipPostingId: "posting-2" }
      ],
      skipDuplicates: true
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not inspect the outbox when delivery is unconfigured", async () => {
    mocks.readWorkerEnv.mockReturnValue({ ...baseEnv, DISCORD_WEBHOOK_URL: undefined });

    await expect(runDiscordNotificationCycle()).resolves.toBeUndefined();

    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("claims and marks a pending notification as sent", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "notification-1",
        internshipPostingId: posting.id,
        attempts: 0,
        internshipPosting: posting
      }
    ]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.update.mockResolvedValue({});
    const client = {
      send: vi.fn().mockResolvedValue({ providerMessageId: "message-1", attempts: 1 })
    };

    await deliverPendingDiscordNotifications(baseEnv as never, {
      client,
      now: () => new Date("2026-08-12T12:30:00.000Z")
    });

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "notification-1" }),
        data: expect.objectContaining({ status: "PROCESSING", attempts: { increment: 1 } })
      })
    );
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenLastCalledWith({
      where: { id: "notification-1" },
      data: expect.objectContaining({
        status: "SENT",
        providerMessageId: "message-1",
        leaseExpiresAt: null
      })
    });
  });

  it("releases a failed claim with a bounded retry time", async () => {
    const now = new Date("2026-08-12T12:30:00.000Z");
    mocks.findMany.mockResolvedValue([
      {
        id: "notification-1",
        internshipPostingId: posting.id,
        attempts: 2,
        internshipPosting: posting
      }
    ]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.update.mockResolvedValue({});
    const client = { send: vi.fn().mockRejectedValue(new Error("Discord unavailable")) };

    await deliverPendingDiscordNotifications(baseEnv as never, {
      client,
      now: () => now
    });

    expect(mocks.update).toHaveBeenLastCalledWith({
      where: { id: "notification-1" },
      data: expect.objectContaining({
        status: "FAILED",
        leaseExpiresAt: null,
        lastError: "Discord unavailable",
        nextAttemptAt: new Date(now.getTime() + outboxRetryDelay(3))
      })
    });
  });

  it("does not send when another worker wins the claim", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "notification-1",
        internshipPostingId: posting.id,
        attempts: 0,
        internshipPosting: posting
      }
    ]);
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const client = { send: vi.fn() };

    await deliverPendingDiscordNotifications(baseEnv as never, { client });

    expect(client.send).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
