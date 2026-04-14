import cron from "node-cron";
import { readWorkerEnv } from "@faang-quant/config";
import { runDailyDigestCycle } from "./jobs/digest";
import { runIngestionCycle } from "./jobs/ingest";
import { logger } from "./lib/logger";

const env = readWorkerEnv();

logger.info(
  {
    pollCron: env.POLL_CRON,
    dailyDigestCron: env.DAILY_DIGEST_CRON
  },
  "Worker scheduler started"
);

cron.schedule(env.POLL_CRON, async () => {
  logger.info("Starting scheduled ingestion cycle");
  await runIngestionCycle();
});

cron.schedule(env.DAILY_DIGEST_CRON, async () => {
  logger.info("Starting scheduled daily digest cycle");
  await runDailyDigestCycle();
});
