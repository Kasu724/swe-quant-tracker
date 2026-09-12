import cron from "node-cron";
import { readWorkerEnv } from "@swe-quant/config";
import { claimDueIngestionSchedule } from "@swe-quant/db";
import { runDailyDigestCycle } from "./jobs/digest";
import { runDiscordNotifications } from "./jobs/discord";
import { runIngestionCycle } from "./jobs/ingest";
import { logger } from "./lib/logger";

const env = readWorkerEnv();
const ingestionScheduleCheckCron = "*/1 * * * *";

logger.info(
  {
    ingestionScheduleCheckCron,
    dailyDigestCron: env.DAILY_DIGEST_CRON,
    discordNotificationCron: env.DISCORD_NOTIFICATION_CRON
  },
  "Worker scheduler started"
);

const runningJobs = new Set<string>();

async function runScheduledJob(name: string, job: () => Promise<unknown>) {
  if (runningJobs.has(name)) {
    logger.warn({ job: name }, "Skipping scheduled job because its previous run is still active");
    return;
  }

  runningJobs.add(name);

  try {
    await job();
  } catch (error) {
    logger.error({ error, job: name }, "Scheduled job failed");
  } finally {
    runningJobs.delete(name);
  }
}

if (!cron.validate(ingestionScheduleCheckCron)) {
  throw new Error(`Invalid ingestion schedule check expression: ${ingestionScheduleCheckCron}`);
}

if (!cron.validate(env.DAILY_DIGEST_CRON)) {
  throw new Error(`Invalid DAILY_DIGEST_CRON expression: ${env.DAILY_DIGEST_CRON}`);
}

if (!cron.validate(env.DISCORD_NOTIFICATION_CRON)) {
  throw new Error(`Invalid DISCORD_NOTIFICATION_CRON expression: ${env.DISCORD_NOTIFICATION_CRON}`);
}

cron.schedule(ingestionScheduleCheckCron, async () => {
  await runScheduledJob("ingestion", async () => {
    const schedule = await claimDueIngestionSchedule();
    if (!schedule) return;

    logger.info(
      { intervalMinutes: schedule.intervalMinutes },
      "Starting scheduled ingestion cycle"
    );
    await runIngestionCycle();
  });
});

cron.schedule(env.DAILY_DIGEST_CRON, async () => {
  logger.info("Starting scheduled daily digest cycle");
  await runScheduledJob("daily-digest", runDailyDigestCycle);
});

cron.schedule(env.DISCORD_NOTIFICATION_CRON, async () => {
  await runScheduledJob("discord-notifications", runDiscordNotifications);
});
