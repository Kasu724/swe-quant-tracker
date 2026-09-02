import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const events: string[] = [];
  const transactionClient = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    postingSourceRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    internshipPosting: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    discordNotification: {
      create: vi.fn()
    }
  };

  return {
    events,
    transactionClient,
    transaction: vi.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) => {
      events.push("transaction:start");
      const result = await callback(transactionClient);
      events.push("transaction:commit");
      return result;
    })
  };
});

vi.mock("@faang-quant/config", () => ({
  readBaseEnv: vi.fn(),
  readWorkerEnv: vi.fn()
}));

vi.mock("@faang-quant/db", () => ({
  IngestionRunStatus: {
    RUNNING: "RUNNING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    PARTIAL: "PARTIAL"
  },
  prisma: {
    $transaction: mocks.transaction
  }
}));

vi.mock("@faang-quant/shared", () => ({
  getPreferredPostingUrl: (posting: { sourceUrl?: string; applicationUrl?: string }) =>
    posting.sourceUrl ?? posting.applicationUrl,
  getAdapter: vi.fn(),
  isUsOrUnknownPostingLocation: vi.fn(),
  isPotentialDuplicate: vi.fn(),
  normalizeFetchedPosting: vi.fn()
}));

vi.mock("../src/lib/alerts", () => ({ sendImmediateAlertsForPostings: vi.fn() }));
vi.mock("../src/lib/discord", () => ({
  readDiscordDeliveryConfiguration: vi.fn(),
  runDiscordNotificationCycle: vi.fn()
}));
vi.mock("../src/lib/link-health", () => ({ resolvePostingUrl: vi.fn() }));
vi.mock("../src/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { persistPosting } from "../src/jobs/ingest";

const source = {
  id: "source-1",
  companyId: "company-1",
  priority: 10,
  company: {
    id: "company-1",
    name: "Example Capital",
    slug: "example-capital"
  }
};

const normalized = {
  slug: "example-capital-quant-intern-2026",
  externalJobId: "job-1",
  title: "Quant Intern",
  normalizedTitle: "quant intern",
  roleCategory: "QUANT_RESEARCH",
  internshipFlag: true,
  season: "SUMMER",
  year: 2027,
  employmentType: "Intern",
  locationRaw: "New York, NY",
  locationsNormalized: [{ raw: "New York, NY", key: "new-york-ny" }],
  locationCountries: ["US"],
  remoteType: "ONSITE",
  compensationMin: 50,
  compensationMax: 60,
  compensationCurrency: "USD",
  compensationInterval: "HOUR",
  payRaw: "$50-$60/hour",
  postingDate: new Date("2026-08-10T00:00:00.000Z"),
  applicationUrl: "https://example.com/apply",
  sourceUrl: "https://example.com/job",
  sourceType: "GREENHOUSE",
  sourceName: "Greenhouse",
  dedupeFingerprint: "fingerprint-1",
  descriptionRaw: "<p>Role</p>",
  descriptionText: "Role",
  requirementsText: "Requirements",
  metadataJson: {},
  rawPostingJson: { id: "job-1" }
};

describe("persistPosting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
    mocks.transactionClient.postingSourceRecord.findUnique.mockResolvedValue(null);
    mocks.transactionClient.internshipPosting.findMany.mockResolvedValue([]);
    mocks.transactionClient.internshipPosting.create.mockImplementation(async () => {
      mocks.events.push("posting:create");
      return { id: "posting-1" };
    });
    mocks.transactionClient.postingSourceRecord.create.mockImplementation(async () => {
      mocks.events.push("source-record:create");
      return {};
    });
    mocks.transactionClient.discordNotification.create.mockImplementation(async () => {
      mocks.events.push("discord-outbox:create");
      return {};
    });
  });

  it("creates the posting and its unique Discord delivery intent atomically", async () => {
    await expect(
      persistPosting({
        source: source as never,
        normalized: normalized as never,
        discordNotificationEligible: true
      })
    ).resolves.toEqual({ postingId: "posting-1", discovered: true });

    expect(mocks.transactionClient.discordNotification.create).toHaveBeenCalledWith({
      data: {
        internshipPostingId: "posting-1",
        eligibleForDelivery: true
      }
    });
    expect(mocks.events).toEqual([
      "transaction:start",
      "posting:create",
      "source-record:create",
      "discord-outbox:create",
      "transaction:commit"
    ]);
  });

  it("fails the transaction result if the outbox intent cannot be created", async () => {
    mocks.transactionClient.discordNotification.create.mockRejectedValue(
      new Error("outbox insert failed")
    );

    await expect(
      persistPosting({
        source: source as never,
        normalized: normalized as never,
        discordNotificationEligible: true
      })
    ).rejects.toThrow("outbox insert failed");
    expect(mocks.events).not.toContain("transaction:commit");
  });

  it("does not create a Discord intent when polling finds an existing posting", async () => {
    const discoveredAt = new Date("2026-08-01T00:00:00.000Z");
    mocks.transactionClient.postingSourceRecord.findUnique.mockResolvedValue({
      id: "source-record-1",
      internshipPostingId: "posting-1",
      internshipPosting: {
        id: "posting-1",
        canonicalSourceId: source.id,
        canonicalSource: source,
        postingDate: new Date("2026-09-01T00:00:00.000Z"),
        discoveredAt
      }
    });
    mocks.transactionClient.postingSourceRecord.update.mockResolvedValue({});
    mocks.transactionClient.internshipPosting.update.mockResolvedValue({});

    await expect(
      persistPosting({
        source: source as never,
        normalized: normalized as never,
        discordNotificationEligible: true
      })
    ).resolves.toEqual({ postingId: "posting-1", discovered: false });

    expect(mocks.transactionClient.discordNotification.create).not.toHaveBeenCalled();
    expect(mocks.transactionClient.internshipPosting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postingDate: discoveredAt })
      })
    );
  });

  it("never stores a new posting date later than its discovery time", async () => {
    const futurePostingDate = new Date("2099-01-01T00:00:00.000Z");

    await persistPosting({
      source: source as never,
      normalized: { ...normalized, postingDate: futurePostingDate } as never,
      discordNotificationEligible: true
    });

    const createCall = mocks.transactionClient.internshipPosting.create.mock.calls[0]?.[0];
    expect(createCall.data.postingDate.getTime()).toBeLessThan(futurePostingDate.getTime());
    expect(createCall.data.postingDate).toEqual(createCall.data.discoveredAt);
  });

  it("does not make a new posting deliverable when Discord was inactive at ingest time", async () => {
    await expect(
      persistPosting({
        source: source as never,
        normalized: normalized as never,
        discordNotificationEligible: false
      })
    ).resolves.toEqual({ postingId: "posting-1", discovered: true });

    expect(mocks.transactionClient.discordNotification.create).toHaveBeenCalledWith({
      data: {
        internshipPostingId: "posting-1",
        eligibleForDelivery: false
      }
    });
  });
});
