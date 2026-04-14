CREATE TYPE "CompanyBucket" AS ENUM ('FAANG', 'BIG_TECH', 'QUANT', 'TRADING', 'HEDGE_FUND', 'OTHER');
CREATE TYPE "SourceType" AS ENUM ('GREENHOUSE', 'LEVER', 'ASHBY', 'WORKDAY', 'CUSTOM_HTML', 'CUSTOM_API', 'BROWSER_AUTOMATION');
CREATE TYPE "RoleCategory" AS ENUM ('SWE', 'QUANT_DEV', 'QUANT_RESEARCH', 'TRADING', 'DATA_ML_AI', 'SECURITY', 'INFRA_SYSTEMS', 'HARDWARE_FPGA_LOW_LATENCY', 'PRODUCT_PM', 'OTHER');
CREATE TYPE "RemoteType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');
CREATE TYPE "CompensationInterval" AS ENUM ('HOUR', 'YEAR', 'MONTH', 'WEEK', 'DAY', 'UNKNOWN');
CREATE TYPE "AlertCadence" AS ENUM ('IMMEDIATE', 'DAILY');
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'DISCORD');
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "ApplicationState" AS ENUM ('NONE', 'APPLIED', 'HIDDEN');
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFY');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "image" TEXT,
  "passwordHash" TEXT,
  "emailVerified" TIMESTAMP(3),
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "alertEmailsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "digestTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "unsubscribeToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "purpose" "VerificationPurpose" NOT NULL DEFAULT 'EMAIL_VERIFY',
  "expires" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "websiteUrl" TEXT,
  "careersUrl" TEXT,
  "companyBucket" "CompanyBucket" NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanySource_pkey" PRIMARY KEY ("id")
);

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
  "locationCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternshipPosting_pkey" PRIMARY KEY ("id")
);

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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostingSourceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedSearch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filterJson" JSONB NOT NULL,
  "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "alertCadence" "AlertCadence" NOT NULL DEFAULT 'IMMEDIATE',
  "lastAlertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "internshipPostingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserApplicationState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "internshipPostingId" TEXT NOT NULL,
  "state" "ApplicationState" NOT NULL DEFAULT 'NONE',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserApplicationState_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE INDEX "VerificationToken_identifier_purpose_idx" ON "VerificationToken"("identifier", "purpose");
CREATE INDEX "VerificationToken_expires_idx" ON "VerificationToken"("expires");
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_companyBucket_isActive_idx" ON "Company"("companyBucket", "isActive");
CREATE UNIQUE INDEX "company_source_unique_identifier" ON "CompanySource"("companyId", "sourceType", "sourceIdentifier");
CREATE INDEX "CompanySource_isActive_pollingEnabled_priority_idx" ON "CompanySource"("isActive", "pollingEnabled", "priority");
CREATE UNIQUE INDEX "InternshipPosting_slug_key" ON "InternshipPosting"("slug");
CREATE INDEX "InternshipPosting_companyId_isActive_discoveredAt_idx" ON "InternshipPosting"("companyId", "isActive", "discoveredAt");
CREATE INDEX "InternshipPosting_postingDate_idx" ON "InternshipPosting"("postingDate");
CREATE INDEX "InternshipPosting_discoveredAt_idx" ON "InternshipPosting"("discoveredAt");
CREATE INDEX "InternshipPosting_roleCategory_year_season_idx" ON "InternshipPosting"("roleCategory", "year", "season");
CREATE INDEX "InternshipPosting_remoteType_isActive_idx" ON "InternshipPosting"("remoteType", "isActive");
CREATE INDEX "InternshipPosting_dedupeFingerprint_idx" ON "InternshipPosting"("dedupeFingerprint");
CREATE INDEX "InternshipPosting_normalizedTitle_idx" ON "InternshipPosting"("normalizedTitle");
CREATE UNIQUE INDEX "source_record_unique_external_job" ON "PostingSourceRecord"("companySourceId", "externalJobId");
CREATE INDEX "PostingSourceRecord_internshipPostingId_idx" ON "PostingSourceRecord"("internshipPostingId");
CREATE UNIQUE INDEX "saved_search_unique_name_per_user" ON "SavedSearch"("userId", "name");
CREATE INDEX "SavedSearch_userId_alertsEnabled_idx" ON "SavedSearch"("userId", "alertsEnabled");
CREATE UNIQUE INDEX "user_favorite_unique_posting" ON "UserFavorite"("userId", "internshipPostingId");
CREATE UNIQUE INDEX "user_application_state_unique_posting" ON "UserApplicationState"("userId", "internshipPostingId");
CREATE UNIQUE INDEX "AlertDelivery_dedupeKey_key" ON "AlertDelivery"("dedupeKey");
CREATE INDEX "AlertDelivery_userId_channel_status_idx" ON "AlertDelivery"("userId", "channel", "status");
CREATE INDEX "AlertDelivery_savedSearchId_createdAt_idx" ON "AlertDelivery"("savedSearchId", "createdAt");
CREATE INDEX "IngestionRun_companySourceId_startedAt_idx" ON "IngestionRun"("companySourceId", "startedAt");
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");
CREATE INDEX "Company_tags_gin_idx" ON "Company" USING GIN ("tags");
CREATE INDEX "InternshipPosting_locationCountries_gin_idx" ON "InternshipPosting" USING GIN ("locationCountries");
CREATE INDEX "InternshipPosting_search_idx" ON "InternshipPosting" USING GIN (
  to_tsvector(
    'english',
    coalesce("companyNameSnapshot", '') || ' ' || coalesce("title", '') || ' ' || coalesce("locationRaw", '')
  )
);

ALTER TABLE "VerificationToken"
  ADD CONSTRAINT "VerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanySource"
  ADD CONSTRAINT "CompanySource_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternshipPosting"
  ADD CONSTRAINT "InternshipPosting_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternshipPosting"
  ADD CONSTRAINT "InternshipPosting_canonicalSourceId_fkey"
  FOREIGN KEY ("canonicalSourceId") REFERENCES "CompanySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostingSourceRecord"
  ADD CONSTRAINT "PostingSourceRecord_internshipPostingId_fkey"
  FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostingSourceRecord"
  ADD CONSTRAINT "PostingSourceRecord_companySourceId_fkey"
  FOREIGN KEY ("companySourceId") REFERENCES "CompanySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedSearch"
  ADD CONSTRAINT "SavedSearch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFavorite"
  ADD CONSTRAINT "UserFavorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFavorite"
  ADD CONSTRAINT "UserFavorite_internshipPostingId_fkey"
  FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserApplicationState"
  ADD CONSTRAINT "UserApplicationState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserApplicationState"
  ADD CONSTRAINT "UserApplicationState_internshipPostingId_fkey"
  FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlertDelivery"
  ADD CONSTRAINT "AlertDelivery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlertDelivery"
  ADD CONSTRAINT "AlertDelivery_savedSearchId_fkey"
  FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlertDelivery"
  ADD CONSTRAINT "AlertDelivery_internshipPostingId_fkey"
  FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IngestionRun"
  ADD CONSTRAINT "IngestionRun_companySourceId_fkey"
  FOREIGN KEY ("companySourceId") REFERENCES "CompanySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
