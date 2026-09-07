const fs = require("node:fs");
const net = require("node:net");

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
    await db.exec('ALTER TABLE "DiscordDestination" ADD COLUMN IF NOT EXISTS "filterJson" JSONB;');
    await db.exec('ALTER TABLE "InternshipPosting" ADD COLUMN IF NOT EXISTS "newGradFlag" BOOLEAN NOT NULL DEFAULT false;');
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

  async function checkHealth() {
    await db.query("SELECT 1");

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      const timeout = setTimeout(() => {
        socket.destroy(new Error(`Embedded database socket health check timed out on port ${port}`));
      }, 1_000);

      const finish = (error) => {
        clearTimeout(timeout);
        socket.destroy();
        if (error) reject(error);
        else resolve();
      };

      socket.once("connect", () => finish());
      socket.once("error", finish);
      socket.once("timeout", () => finish(new Error(`Embedded database socket timed out on port ${port}`)));
    });
  }

  return {
    connectionUrl: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable&pgbouncer=true&connection_limit=1`,
    checkHealth,
    async stop() {
      await socketServer.stop();
      await db.close();
    }
  };
}

module.exports = { startEmbeddedDatabase };
