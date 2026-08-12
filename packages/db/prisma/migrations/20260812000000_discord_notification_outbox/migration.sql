CREATE TYPE "DiscordNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "DiscordNotification" (
    "id" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "status" "DiscordNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscordNotification_internshipPostingId_key"
ON "DiscordNotification"("internshipPostingId");

CREATE INDEX "DiscordNotification_status_nextAttemptAt_idx"
ON "DiscordNotification"("status", "nextAttemptAt");

CREATE INDEX "DiscordNotification_status_leaseExpiresAt_idx"
ON "DiscordNotification"("status", "leaseExpiresAt");

ALTER TABLE "DiscordNotification"
ADD CONSTRAINT "DiscordNotification_internshipPostingId_fkey"
FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
