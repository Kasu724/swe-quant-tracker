-- Existing pending rows may represent jobs discovered during older ingestion
-- cycles while Discord was unconfigured. Keep them for audit history, but do
-- not deliver them as though they were new jobs in a later cycle.
ALTER TABLE "DiscordNotification"
ADD COLUMN "eligibleForDelivery" BOOLEAN NOT NULL DEFAULT false;

-- Notifications created after this migration explicitly inherit the current
-- Discord configuration and are eligible by default unless ingestion says
-- otherwise.
ALTER TABLE "DiscordNotification"
ALTER COLUMN "eligibleForDelivery" SET DEFAULT true;

CREATE INDEX "discord_notification_eligible_status_next_idx"
ON "DiscordNotification"("eligibleForDelivery", "status", "nextAttemptAt");
