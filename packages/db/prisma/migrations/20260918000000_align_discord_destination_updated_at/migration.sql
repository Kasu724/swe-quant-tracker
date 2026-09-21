-- Prisma manages @updatedAt values in the client, so this column should not
-- retain the database default from the migration that created the table.
ALTER TABLE "DiscordDestination" ALTER COLUMN "updatedAt" DROP DEFAULT;
