const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

async function reserveLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function applyMigrations(db, migrationsDirectory) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS "_desktop_migrations" (
      "name" TEXT PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedResult = await db.query('SELECT "name" FROM "_desktop_migrations"');
  const applied = new Set(appliedResult.rows.map((row) => row.name));
  const migrations = fs
    .readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+_[a-z0-9_]+$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  for (const migration of migrations) {
    if (applied.has(migration)) continue;

    const sql = fs.readFileSync(path.join(migrationsDirectory, migration, "migration.sql"), "utf8");
    const escapedName = migration.replaceAll("'", "''");
    await db.exec(`BEGIN;\n${sql}\nINSERT INTO "_desktop_migrations" ("name") VALUES ('${escapedName}');\nCOMMIT;`);
  }
}

async function startEmbeddedDatabase({ dataDirectory, migrationsDirectory }) {
  const [{ PGlite }, { PGLiteSocketServer }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite-socket")
  ]);

  fs.mkdirSync(dataDirectory, { recursive: true });
  const db = await PGlite.create(dataDirectory);
  await applyMigrations(db, migrationsDirectory);

  const port = await reserveLoopbackPort();
  const socketServer = new PGLiteSocketServer({
    db,
    host: "127.0.0.1",
    port,
    maxConnections: 20
  });
  await socketServer.start();

  return {
    connectionUrl: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable&pgbouncer=true&connection_limit=1`,
    async stop() {
      await socketServer.stop();
      await db.close();
    }
  };
}

module.exports = { startEmbeddedDatabase };
