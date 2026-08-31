CREATE TABLE "DiscordDestination" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Discord',
    "webhookUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" BOOLEAN,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordDestination_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscordDestination_userId_key"
ON "DiscordDestination"("userId");

CREATE INDEX "DiscordDestination_enabled_idx"
ON "DiscordDestination"("enabled");

CREATE TABLE "DiscordDestinationCompany" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordDestinationCompany_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discord_destination_company_unique"
ON "DiscordDestinationCompany"("destinationId", "companyId");

CREATE INDEX "DiscordDestinationCompany_companyId_idx"
ON "DiscordDestinationCompany"("companyId");

ALTER TABLE "DiscordDestination"
ADD CONSTRAINT "DiscordDestination_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscordDestinationCompany"
ADD CONSTRAINT "DiscordDestinationCompany_destinationId_fkey"
FOREIGN KEY ("destinationId") REFERENCES "DiscordDestination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscordDestinationCompany"
ADD CONSTRAINT "DiscordDestinationCompany_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
