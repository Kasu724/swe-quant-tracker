ALTER TABLE "Company" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CompanySource" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "InternshipPosting" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "PostingSourceRecord" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "SavedSearch" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "UserApplicationState" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER INDEX "Company_tags_gin_idx" RENAME TO "Company_tags_idx";
ALTER INDEX "InternshipPosting_locationCountries_gin_idx" RENAME TO "InternshipPosting_locationCountries_idx";
