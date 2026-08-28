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
      migrationsDirectory: path.join(__dirname, "..", "..", "..", "packages", "db", "prisma", "migrations")
    });
    prisma = new PrismaClient({ datasources: { db: { url: database.connectionUrl } } });
    const tables = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`;
    if (!tables[0] || tables[0].count < 10) throw new Error("Desktop schema was not created");
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
