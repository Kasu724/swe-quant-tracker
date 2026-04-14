import { sendDailyDigests } from "../lib/alerts";
import { logger } from "../lib/logger";

export async function runDailyDigestCycle() {
  await sendDailyDigests();
  logger.info("Daily digest cycle completed");
}

