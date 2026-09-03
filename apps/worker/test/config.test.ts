import { describe, expect, it } from "vitest";
import { readWorkerEnv } from "@swe-quant/config";

const requiredEnv = {
  DATABASE_URL: "postgresql://localhost/test"
};

describe("Discord worker configuration", () => {
  it("treats an empty webhook as disabled and applies safe defaults", () => {
    const env = readWorkerEnv({
      ...requiredEnv,
      DISCORD_WEBHOOK_URL: ""
    });

    expect(env.DISCORD_WEBHOOK_URL).toBeUndefined();
    expect(env.DISCORD_WEBHOOK_TIMEOUT_MS).toBe(5_000);
    expect(env.DISCORD_MAX_RETRIES).toBe(3);
    expect(env.DISCORD_NOTIFICATION_BATCH_SIZE).toBe(25);
    expect(env.DISCORD_NOTIFICATION_CRON).toBe("* * * * *");
  });

  it("accepts Discord's versioned HTTPS webhook URLs", () => {
    const env = readWorkerEnv({
      ...requiredEnv,
      DISCORD_WEBHOOK_URL: "https://discord.com/api/v10/webhooks/123/token"
    });

    expect(env.DISCORD_WEBHOOK_URL).toBe("https://discord.com/api/v10/webhooks/123/token");
  });

  it.each([
    "http://discord.com/api/webhooks/123/token",
    "https://evil.example/api/webhooks/123/token",
    "https://user:password@discord.com/api/webhooks/123/token",
    "https://discord.com/channels/123"
  ])("rejects an unsafe or malformed webhook URL: %s", (webhookUrl) => {
    expect(() =>
      readWorkerEnv({
        ...requiredEnv,
        DISCORD_WEBHOOK_URL: webhookUrl
      })
    ).toThrow("Must be an HTTPS Discord webhook URL");
  });
});
