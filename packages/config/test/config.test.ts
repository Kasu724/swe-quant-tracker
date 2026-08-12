import { describe, expect, it } from "vitest";
import { parseAdminEmails, readBaseEnv, readWorkerEnv } from "../src";

const minimumEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/tracker"
};

describe("environment configuration", () => {
  it("applies safe local defaults and coerces numeric settings", () => {
    const env = readWorkerEnv({
      ...minimumEnv,
      INGESTION_CONCURRENCY: "4",
      DISCORD_WEBHOOK_TIMEOUT_MS: "2500"
    });

    expect(env.EMAIL_PROVIDER).toBe("console");
    expect(env.INGESTION_CONCURRENCY).toBe(4);
    expect(env.DISCORD_WEBHOOK_TIMEOUT_MS).toBe(2500);
  });

  it("rejects invalid base URLs and non-positive limits", () => {
    expect(() => readBaseEnv({ ...minimumEnv, APP_BASE_URL: "not-a-url" })).toThrow();
    expect(() =>
      readWorkerEnv({ ...minimumEnv, INGESTION_CONCURRENCY: "0" })
    ).toThrow();
  });

  it("normalizes configured administrator emails", () => {
    expect(parseAdminEmails(" ADMIN@EXAMPLE.COM, second@example.com ,, ")).toEqual([
      "admin@example.com",
      "second@example.com"
    ]);
  });
});
