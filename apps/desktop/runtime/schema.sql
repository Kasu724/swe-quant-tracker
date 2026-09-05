-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompanyBucket" AS ENUM ('FAANG', 'BIG_TECH', 'QUANT', 'TRADING', 'HEDGE_FUND', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('GREENHOUSE', 'LEVER', 'ASHBY', 'WORKDAY', 'CUSTOM_HTML', 'CUSTOM_API', 'BROWSER_AUTOMATION');

-- CreateEnum
CREATE TYPE "RoleCategory" AS ENUM ('SWE', 'QUANT_DEV', 'QUANT_RESEARCH', 'TRADING', 'DATA_ML_AI', 'SECURITY', 'INFRA_SYSTEMS', 'HARDWARE_FPGA_LOW_LATENCY', 'PRODUCT_PM', 'OTHER');

-- CreateEnum
CREATE TYPE "RemoteType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CompensationInterval" AS ENUM ('HOUR', 'YEAR', 'MONTH', 'WEEK', 'DAY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AlertCadence" AS ENUM ('IMMEDIATE', 'DAILY');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'DISCORD');

-- CreateEnum
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DiscordNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationState" AS ENUM ('NONE', 'APPLIED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "alertEmailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "digestTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "unsubscribeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "careersUrl" TEXT,
    "companyBucket" "CompanyBucket" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySource" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceIdentifier" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "pollingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "requestConfigJson" JSONB,
    "parserConfigJson" JSONB,
    "lastPolledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipPosting" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "canonicalSourceId" TEXT,
    "externalJobId" TEXT,
    "companyNameSnapshot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "roleCategory" "RoleCategory" NOT NULL DEFAULT 'OTHER',
    "internshipFlag" BOOLEAN NOT NULL DEFAULT true,
    "season" TEXT,
    "year" INTEGER,
    "employmentType" TEXT,
    "locationRaw" TEXT,
    "locationsNormalized" JSONB,
    "locationCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remoteType" "RemoteType" NOT NULL DEFAULT 'UNKNOWN',
    "compensationMin" DECIMAL(12,2),
    "compensationMax" DECIMAL(12,2),
    "compensationCurrency" TEXT,
    "compensationInterval" "CompensationInterval" NOT NULL DEFAULT 'UNKNOWN',
    "payRaw" TEXT,
    "postingDate" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationUrl" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dedupeFingerprint" TEXT NOT NULL,
    "descriptionRaw" TEXT,
    "descriptionText" TEXT,
    "requirementsText" TEXT,
    "metadataJson" JSONB,
    "rawPostingJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternshipPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingSourceRecord" (
    "id" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "companySourceId" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "rawPayloadJson" JSONB NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUrl" TEXT,
    "applicationUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostingSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filterJson" JSONB NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertCadence" "AlertCadence" NOT NULL DEFAULT 'IMMEDIATE',
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordNotification" (
    "id" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "eligibleForDelivery" BOOLEAN NOT NULL DEFAULT true,
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

-- CreateTable
CREATE TABLE "DiscordDestination" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Discord',
    "webhookUrl" TEXT NOT NULL,
    "filterJson" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" BOOLEAN,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordDestinationCompany" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordDestinationCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPostingListItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPostingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApplicationState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "state" "ApplicationState" NOT NULL DEFAULT 'NONE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApplicationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedSearchId" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "status" "AlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "companySourceId" TEXT,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "statsJson" JSONB,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_companyBucket_isActive_idx" ON "Company"("companyBucket", "isActive");

-- CreateIndex
CREATE INDEX "Company_tags_idx" ON "Company" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "CompanySource_isActive_pollingEnabled_priority_idx" ON "CompanySource"("isActive", "pollingEnabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "company_source_unique_identifier" ON "CompanySource"("companyId", "sourceType", "sourceIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipPosting_slug_key" ON "InternshipPosting"("slug");

-- CreateIndex
CREATE INDEX "InternshipPosting_companyId_isActive_discoveredAt_idx" ON "InternshipPosting"("companyId", "isActive", "discoveredAt");

-- CreateIndex
CREATE INDEX "InternshipPosting_postingDate_idx" ON "InternshipPosting"("postingDate");

-- CreateIndex
CREATE INDEX "InternshipPosting_discoveredAt_idx" ON "InternshipPosting"("discoveredAt");

-- CreateIndex
CREATE INDEX "InternshipPosting_roleCategory_year_season_idx" ON "InternshipPosting"("roleCategory", "year", "season");

-- CreateIndex
CREATE INDEX "InternshipPosting_remoteType_isActive_idx" ON "InternshipPosting"("remoteType", "isActive");

-- CreateIndex
CREATE INDEX "InternshipPosting_dedupeFingerprint_idx" ON "InternshipPosting"("dedupeFingerprint");

-- CreateIndex
CREATE INDEX "InternshipPosting_normalizedTitle_idx" ON "InternshipPosting"("normalizedTitle");

-- CreateIndex
CREATE INDEX "InternshipPosting_locationCountries_idx" ON "InternshipPosting" USING GIN ("locationCountries");

-- CreateIndex
CREATE INDEX "PostingSourceRecord_internshipPostingId_idx" ON "PostingSourceRecord"("internshipPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "source_record_unique_external_job" ON "PostingSourceRecord"("companySourceId", "externalJobId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_alertsEnabled_idx" ON "SavedSearch"("userId", "alertsEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "saved_search_unique_name_per_user" ON "SavedSearch"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_unique_posting" ON "UserFavorite"("userId", "internshipPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordNotification_internshipPostingId_key" ON "DiscordNotification"("internshipPostingId");

-- CreateIndex
CREATE INDEX "DiscordNotification_status_nextAttemptAt_idx" ON "DiscordNotification"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "DiscordNotification_status_leaseExpiresAt_idx" ON "DiscordNotification"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "discord_notification_eligible_status_next_idx" ON "DiscordNotification"("eligibleForDelivery", "status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordDestination_userId_key" ON "DiscordDestination"("userId");

-- CreateIndex
CREATE INDEX "DiscordDestination_enabled_idx" ON "DiscordDestination"("enabled");

-- CreateIndex
CREATE INDEX "DiscordDestinationCompany_companyId_idx" ON "DiscordDestinationCompany"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "discord_destination_company_unique" ON "DiscordDestinationCompany"("destinationId", "companyId");

-- CreateIndex
CREATE INDEX "UserPostingListItem_userId_createdAt_idx" ON "UserPostingListItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserPostingListItem_userId_isCompleted_idx" ON "UserPostingListItem"("userId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "user_posting_list_unique_posting" ON "UserPostingListItem"("userId", "internshipPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_application_state_unique_posting" ON "UserApplicationState"("userId", "internshipPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertDelivery_dedupeKey_key" ON "AlertDelivery"("dedupeKey");

-- CreateIndex
CREATE INDEX "AlertDelivery_userId_channel_status_idx" ON "AlertDelivery"("userId", "channel", "status");

-- CreateIndex
CREATE INDEX "AlertDelivery_savedSearchId_createdAt_idx" ON "AlertDelivery"("savedSearchId", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionRun_companySourceId_startedAt_idx" ON "IngestionRun"("companySourceId", "startedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "CompanySource" ADD CONSTRAINT "CompanySource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipPosting" ADD CONSTRAINT "InternshipPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipPosting" ADD CONSTRAINT "InternshipPosting_canonicalSourceId_fkey" FOREIGN KEY ("canonicalSourceId") REFERENCES "CompanySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingSourceRecord" ADD CONSTRAINT "PostingSourceRecord_internshipPostingId_fkey" FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingSourceRecord" ADD CONSTRAINT "PostingSourceRecord_companySourceId_fkey" FOREIGN KEY ("companySourceId") REFERENCES "CompanySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_internshipPostingId_fkey" FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordNotification" ADD CONSTRAINT "DiscordNotification_internshipPostingId_fkey" FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordDestination" ADD CONSTRAINT "DiscordDestination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordDestinationCompany" ADD CONSTRAINT "DiscordDestinationCompany_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "DiscordDestination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordDestinationCompany" ADD CONSTRAINT "DiscordDestinationCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostingListItem" ADD CONSTRAINT "UserPostingListItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostingListItem" ADD CONSTRAINT "UserPostingListItem_internshipPostingId_fkey" FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApplicationState" ADD CONSTRAINT "UserApplicationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApplicationState" ADD CONSTRAINT "UserApplicationState_internshipPostingId_fkey" FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_internshipPostingId_fkey" FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_companySourceId_fkey" FOREIGN KEY ("companySourceId") REFERENCES "CompanySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
