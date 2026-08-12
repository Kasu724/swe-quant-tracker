import { runDiscordNotificationCycle } from "../lib/discord";
import { logger } from "../lib/logger";

export async function runDiscordNotifications() {
  await runDiscordNotificationCycle();
  logger.info("Discord notification cycle completed");
}
