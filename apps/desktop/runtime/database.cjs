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

  // The embedded desktop database treats the Prisma schema as its final,
  // immutable schema. Existing databases are left intact; fresh databases
  // receive the complete schema snapshot in one transaction.
  if (result.rows[0]?.exists) return;

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

  return {
    connectionUrl: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable&pgbouncer=true&connection_limit=1`,
    async stop() {
      await socketServer.stop();
      await db.close();
    }
  };
}

module.exports = { startEmbeddedDatabase };
