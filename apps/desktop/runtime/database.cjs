const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

function loadPrismaClient() {
  const packagedClient = path.join(
    __dirname,
    "..",
    "server",
    "apps",
    "web",
    "node_modules",
    "@prisma",
    "client"
  );

  // The packaged desktop app already carries the generated Prisma client with the standalone web
  // server. Development and database smoke tests resolve it through the workspace dependency.
  return fs.existsSync(path.join(packagedClient, "package.json"))
    ? require(packagedClient).PrismaClient
    : require("@prisma/client").PrismaClient;
}

const PrismaClient = loadPrismaClient();

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

async function initializeSchema(db, schemaPath) {
  const result = await db.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'User'
    ) AS "exists"
  `);

  // Apply additive upgrades before starting services against an existing database.
  if (result.rows[0]?.exists) {
    for (const category of ["DATA", "ML_AI", "HARDWARE_EMBEDDED", "ENGINEERING"]) {
      await db.exec(`ALTER TYPE "RoleCategory" ADD VALUE IF NOT EXISTS '${category}';`);
    }
    const roleBackfillPath = require("node:path").join(
      require("node:path").dirname(schemaPath),
      "role-backfill.sql"
    );
    if (fs.existsSync(roleBackfillPath)) {
      await db.exec(fs.readFileSync(roleBackfillPath, "utf8"));
    }
    await db.exec('ALTER TABLE "DiscordDestination" ADD COLUMN IF NOT EXISTS "filterJson" JSONB;');
    await db.exec('ALTER TABLE "InternshipPosting" ADD COLUMN IF NOT EXISTS "newGradFlag" BOOLEAN NOT NULL DEFAULT false;');
    await db.exec('CREATE INDEX IF NOT EXISTS "InternshipPosting_newGradFlag_isActive_idx" ON "InternshipPosting"("newGradFlag", "isActive");');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS "IngestionSchedule" (
        "id" TEXT NOT NULL,
        "intervalMinutes" INTEGER NOT NULL DEFAULT 30,
        "nextRunAt" TIMESTAMP(3) NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "IngestionSchedule_pkey" PRIMARY KEY ("id")
      );
    `);
    return;
  }

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await db.exec(`BEGIN;\n${schemaSql}\nCOMMIT;`);
}

async function startEmbeddedDatabase({ dataDirectory, schemaPath }) {
  const [{ PGlite }, { PGLiteSocketServer }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite-socket")
  ]);

  fs.mkdirSync(dataDirectory, { recursive: true });
  const db = await PGlite.create(dataDirectory);
  await initializeSchema(db, schemaPath);

  const port = await reserveLoopbackPort();
  const socketServer = new PGLiteSocketServer({
    db,
    host: "127.0.0.1",
    port,
    maxConnections: 20
  });
  await socketServer.start();

  const connectionUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable&pgbouncer=true&connection_limit=1&connect_timeout=2&pool_timeout=2`;
  const healthClient = new PrismaClient({
    datasources: {
      db: { url: connectionUrl }
    }
  });

  async function checkHealth() {
    // Exercise the same PostgreSQL protocol path as the application. A bare TCP probe followed by
    // an immediate destroy can make the socket server emit ECONNRESET, while querying `db` directly
    // can interleave with an application transaction and observe its aborted state.
    await healthClient.$queryRawUnsafe("SELECT 1");
  }

  return {
    connectionUrl,
    checkHealth,
    async stop() {
      let stopError;
      for (const stop of [
        () => healthClient.$disconnect(),
        () => socketServer.stop(),
        () => db.close()
      ]) {
        try {
          await stop();
        } catch (error) {
          stopError ??= error;
        }
      }
      if (stopError) throw stopError;
    }
  };
}

module.exports = { startEmbeddedDatabase };
