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
    await prisma.$disconnect();
    prisma = undefined;
    await database.stop();
    database = undefined;

    database = await startEmbeddedDatabase({
      dataDirectory,
      schemaPath: path.join(__dirname, "..", "runtime", "schema.sql")
    });
    prisma = new PrismaClient({ datasources: { db: { url: database.connectionUrl } } });
    const persistedCompany = await prisma.company.findUnique({ where: { slug: "desktop-persistence-test" } });
    if (!persistedCompany) throw new Error("Desktop data did not persist after reopening the database");
    console.log(`Embedded database smoke test passed (${tables[0].count} public tables).`);
  } finally {
    await prisma?.$disconnect();
    await database?.stop();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
