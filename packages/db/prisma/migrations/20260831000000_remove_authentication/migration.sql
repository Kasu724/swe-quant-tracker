DROP TABLE IF EXISTS "VerificationToken";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "passwordHash",
  DROP COLUMN IF EXISTS "emailVerified",
  DROP COLUMN IF EXISTS "role";

DROP TYPE IF EXISTS "VerificationPurpose";
DROP TYPE IF EXISTS "UserRole";
