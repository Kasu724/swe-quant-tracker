-- Protect invariants that Prisma's schema language cannot currently express.
-- Preflight existing data before deploy when importing a database created outside
-- this migration history; `VALIDATE CONSTRAINT` will reject inconsistent rows.

ALTER TABLE "InternshipPosting"
ADD CONSTRAINT "InternshipPosting_year_valid"
CHECK ("year" IS NULL OR "year" BETWEEN 2000 AND 2100) NOT VALID;

ALTER TABLE "InternshipPosting"
ADD CONSTRAINT "InternshipPosting_compensation_valid"
CHECK (
  ("compensationMin" IS NULL OR "compensationMin" >= 0)
  AND ("compensationMax" IS NULL OR "compensationMax" >= 0)
  AND (
    "compensationMin" IS NULL
    OR "compensationMax" IS NULL
    OR "compensationMin" <= "compensationMax"
  )
) NOT VALID;

ALTER TABLE "UserPostingListItem"
ADD CONSTRAINT "UserPostingListItem_completion_valid"
CHECK ("isCompleted" = ("completedAt" IS NOT NULL)) NOT VALID;

ALTER TABLE "AlertDelivery"
ADD CONSTRAINT "AlertDelivery_sent_timestamp_valid"
CHECK (("status" = 'SENT') = ("sentAt" IS NOT NULL)) NOT VALID;

ALTER TABLE "InternshipPosting"
VALIDATE CONSTRAINT "InternshipPosting_year_valid";

ALTER TABLE "InternshipPosting"
VALIDATE CONSTRAINT "InternshipPosting_compensation_valid";

ALTER TABLE "UserPostingListItem"
VALIDATE CONSTRAINT "UserPostingListItem_completion_valid";

ALTER TABLE "AlertDelivery"
VALIDATE CONSTRAINT "AlertDelivery_sent_timestamp_valid";

-- Every application write normalizes email casing. This index closes the final
-- race/legacy-import gap while preserving the existing Prisma `email` unique key.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));
