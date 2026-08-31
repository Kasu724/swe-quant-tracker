import { describe, expect, it } from "vitest";
import { readBaseEnv, readWorkerEnv } from "../src";

const minimumEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/tracker"
};

describe("environment configuration", () => {
  it("applies safe local defaults and coerces numeric settings", () => {
    const defaults = readWorkerEnv(minimumEnv);
    expect(defaults.INGESTION_URL_VALIDATION_CONCURRENCY).toBe(5);

    const env = readWorkerEnv({
      ...minimumEnv,
      INGESTION_CONCURRENCY: "4",
      INGESTION_URL_VALIDATION_CONCURRENCY: "7",
      DISCORD_WEBHOOK_TIMEOUT_MS: "2500"
    });

    expect(env.EMAIL_PROVIDER).toBe("console");
    expect(env.INGESTION_CONCURRENCY).toBe(4);
    expect(env.INGESTION_URL_VALIDATION_CONCURRENCY).toBe(7);
    expect(env.DISCORD_WEBHOOK_TIMEOUT_MS).toBe(2500);
  });

  it("rejects invalid base URLs and non-positive limits", () => {
    expect(() => readBaseEnv({ ...minimumEnv, APP_BASE_URL: "not-a-url" })).toThrow();
    expect(() =>
      readWorkerEnv({ ...minimumEnv, INGESTION_CONCURRENCY: "0" })
    ).toThrow();
    expect(() =>
      readWorkerEnv({ ...minimumEnv, INGESTION_URL_VALIDATION_CONCURRENCY: "0" })
    ).toThrow();
    expect(() =>
      readWorkerEnv({ ...minimumEnv, INGESTION_URL_VALIDATION_CONCURRENCY: "21" })
    ).toThrow();
  });
});
