const assert = require("node:assert/strict");
const http = require("node:http");
const { isConnectionResetError, probeHttp, withTimeout } = require("../runtime/supervision.cjs");

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not provide a port");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function main() {
  assert.equal(isConnectionResetError(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })), true);
  assert.equal(isConnectionResetError(new Error("connection refused")), false);
  assert.equal(isConnectionResetError({ cause: new Error("read ECONNRESET") }), true);

  assert.equal(await withTimeout(() => Promise.resolve("healthy"), 100, "unexpected timeout"), "healthy");

  const startedAt = Date.now();
  await assert.rejects(
    withTimeout(() => new Promise(() => {}), 25, "health probe timed out"),
    /health probe timed out/
  );
  assert.ok(Date.now() - startedAt < 500, "A hung health probe was not bounded by its timeout");

  const healthy = await listen((_request, response) => {
    response.writeHead(200);
    response.end("ok");
  });
  const failing = await listen((_request, response) => {
    response.writeHead(500);
    response.end("server-side render failed");
  });

  try {
    assert.equal(await probeHttp(healthy.origin), true);
    assert.equal(await probeHttp(failing.origin), false);
  } finally {
    await Promise.all([close(healthy.server), close(failing.server)]);
  }

  console.log("Desktop service supervision tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
