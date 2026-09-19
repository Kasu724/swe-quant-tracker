const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");

const workspace = path.resolve(__dirname, "..", "..", "..");
const migrations = path.join(workspace, "packages", "db", "prisma", "migrations");

async function main() {
  const db = await PGlite.create();

  try {
    await db.exec(`
      CREATE TYPE "RoleCategory" AS ENUM ('SWE', 'QUANT_DEV', 'QUANT_RESEARCH', 'TRADING', 'DATA_ML_AI', 'SECURITY', 'INFRA_SYSTEMS', 'HARDWARE_FPGA_LOW_LATENCY', 'PRODUCT_PM', 'OTHER');
      CREATE TABLE "InternshipPosting" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "roleCategory" "RoleCategory" NOT NULL);
      INSERT INTO "InternshipPosting" VALUES
        ('software', 'Software Engineer Intern', 'HARDWARE_FPGA_LOW_LATENCY'),
        ('data', 'Data Analyst Intern', 'DATA_ML_AI'),
        ('ml', 'Machine Learning Engineer Intern', 'DATA_ML_AI'),
        ('fpga', 'FPGA Systems Engineer', 'INFRA_SYSTEMS'),
        ('low-latency', 'Low Latency Systems Engineer', 'HARDWARE_FPGA_LOW_LATENCY'),
        ('general', 'Engineering Intern', 'HARDWARE_FPGA_LOW_LATENCY');
    `);

    await db.exec(fs.readFileSync(path.join(migrations, "20260919000000_add_role_categories", "migration.sql"), "utf8"));
    await db.exec(fs.readFileSync(path.join(migrations, "20260919010000_backfill_role_categories", "migration.sql"), "utf8"));

    const { rows } = await db.query('SELECT "id", "roleCategory" FROM "InternshipPosting" ORDER BY "id"');
    assert.deepEqual(Object.fromEntries(rows.map((row) => [row.id, row.roleCategory])), {
      data: "DATA",
      fpga: "HARDWARE_EMBEDDED",
      general: "ENGINEERING",
      "low-latency": "INFRA_SYSTEMS",
      ml: "ML_AI",
      software: "SWE"
    });
    console.log("Role-category migration smoke test passed.");
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
