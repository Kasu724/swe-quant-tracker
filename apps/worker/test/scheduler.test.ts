import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  scheduled: new Map<string, () => Promise<void>>(),
  validate: vi.fn().mockReturnValue(true),
  ingest: vi.fn(),
  digest: vi.fn(),
  discord: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn()
}));

vi.mock("node-cron", () => ({
  default: {
    validate: mocks.validate,
    schedule: vi.fn((expression: string, callback: () => Promise<void>) => {
      mocks.scheduled.set(expression, callback);
    })
  }
}));

vi.mock("@faang-quant/config", () => ({
  readWorkerEnv: () => ({
    POLL_CRON: "*/30 * * * *",
    DAILY_DIGEST_CRON: "0 8 * * *",
    DISCORD_NOTIFICATION_CRON: "* * * * *"
  })
}));

vi.mock("../src/jobs/ingest", () => ({ runIngestionCycle: mocks.ingest }));
vi.mock("../src/jobs/digest", () => ({ runDailyDigestCycle: mocks.digest }));
vi.mock("../src/jobs/discord", () => ({ runDiscordNotifications: mocks.discord }));
vi.mock("../src/lib/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError
  }
}));

describe("worker scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scheduled.clear();
  });

  it("schedules Discord delivery independently and prevents overlapping runs", async () => {
    let finishFirstRun: (() => void) | undefined;
    mocks.discord.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishFirstRun = resolve;
        })
    );

    await import("../src/index");

    expect(mocks.scheduled.has("* * * * *")).toBe(true);
    const callback = mocks.scheduled.get("* * * * *")!;
    const firstRun = callback();
    await vi.waitFor(() => expect(mocks.discord).toHaveBeenCalledTimes(1));
    await callback();

    expect(mocks.discord).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      { job: "discord-notifications" },
      "Skipping scheduled job because its previous run is still active"
    );

    finishFirstRun?.();
    await firstRun;
  });
});
