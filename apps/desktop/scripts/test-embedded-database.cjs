const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { startEmbeddedDatabase } = require("../runtime/database.cjs");

async function main() {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "faang-quant-pglite-"));
  let database;
  let prisma;

  try {
    database = await startEmbeddedDatabase({
      dataDirectory,
      schemaPath: path.join(__dirname, "..", "runtime", "schema.sql")
    });
    prisma = new PrismaClient({ datasources: { db: { url: database.connectionUrl } } });
    await database.checkHealth();
    const tables = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`;
    if (!tables[0] || tables[0].count < 10) throw new Error("Desktop schema was not created");
    const migrationTable = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_desktop_migrations'
    `;
    if (migrationTable[0]?.count !== 0) throw new Error("Desktop schema unexpectedly created a migration table");

    await prisma.company.create({
      data: {
        name: "Desktop persistence test",
        slug: "desktop-persistence-test",
        companyBucket: "FAANG"
      }
    });
    // Simulate a database created before notification filters were introduced.
    await prisma.$executeRawUnsafe('ALTER TABLE "DiscordDestination" DROP COLUMN "filterJson"');
    // Simulate a database created before new-graduate classification was added.
    await prisma.$executeRawUnsafe('ALTER TABLE "InternshipPosting" DROP COLUMN "newGradFlag"');
    await prisma.$disconnect();
    prisma = undefined;
    await database.stop();
    database = undefined;

    database = await startEmbeddedDatabase({
      dataDirectory,
      schemaPath: path.join(__dirname, "..", "runtime", "schema.sql")
    });
    prisma = new PrismaClient({ datasources: { db: { url: database.connectionUrl } } });
    await database.checkHealth();
    const persistedCompany = await prisma.company.findUnique({ where: { slug: "desktop-persistence-test" } });
    if (!persistedCompany) throw new Error("Desktop data did not persist after reopening the database");
    const upgradedColumns = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'InternshipPosting' AND column_name = 'newGradFlag'
    `;
    if (upgradedColumns[0]?.count !== 1) throw new Error("New-graduate column was not restored by schema upgrade");
    const upgradedIndexes = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'InternshipPosting_newGradFlag_isActive_idx'
    `;
    if (upgradedIndexes[0]?.count !== 1) throw new Error("New-graduate index was not restored by schema upgrade");
    const persistedPosting = await prisma.internshipPosting.create({
      data: {
        companyId: persistedCompany.id,
        companyNameSnapshot: persistedCompany.name,
        slug: "desktop-new-grad-persistence",
        title: "Software Engineer, New Grad",
        normalizedTitle: "software engineer new grad",
        roleCategory: "SWE",
        internshipFlag: false,
        newGradFlag: true,
        applicationUrl: "https://example.invalid/jobs/new-grad",
        sourceType: "CUSTOM_API",
        sourceName: "Desktop smoke test",
        dedupeFingerprint: "desktop-new-grad-persistence"
      }
    });
    if (!persistedPosting.newGradFlag || persistedPosting.internshipFlag) {
      throw new Error("New-graduate classification did not persist correctly");
    }
    const user = await prisma.user.create({ data: { email: "filters@example.invalid" } });
    await prisma.discordDestination.create({
      data: {
        userId: user.id,
        webhookUrl: "https://discord.com/api/webhooks/test/test",
        filterJson: { roleCategories: ["SWE"], minimumPay: 50 }
      }
    });
    const destination = await prisma.discordDestination.findUnique({ where: { userId: user.id } });
    if (destination.filterJson.minimumPay !== 50) throw new Error("Notification filters did not persist after schema upgrade");
    console.log(`Embedded database smoke test passed (${tables[0].count} public tables).`);
  } finally {
    await prisma?.$disconnect();
    await database?.stop();
    const resolvedDirectory = path.resolve(dataDirectory);
    if (path.dirname(resolvedDirectory) !== path.resolve(os.tmpdir()) ||
        !path.basename(resolvedDirectory).startsWith("faang-quant-pglite-")) {
      throw new Error("Refusing to remove a directory outside the database test temporary workspace");
    }
    fs.rmSync(resolvedDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
