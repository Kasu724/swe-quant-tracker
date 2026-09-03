const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { startEmbeddedDatabase } = require("./database.cjs");

const PRODUCT_NAME = "FAANG Quant Tracker";
const distributionDirectory = path.join(__dirname, "..");
let database;
let serverProcess;
let workerProcess;
let ingestionProcess;
let controlServer;
let logDescriptor;
let cleanupStarted = false;
let fatalErrorReported = false;
let commandBuffer = "";
const controlToken = crypto.randomBytes(32).toString("base64url");
let ingestionStatus = {
  phase: "idle",
  running: false,
  totalSources: 0,
  completedSources: 0,
  activeSources: [],
  discovered: 0,
  failedSources: 0,
  partialSources: 0,
  startedAt: null,
  finishedAt: null,
  error: null
};

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const userDataDirectory = path.resolve(
  argumentValue("user-data-dir") ||
  path.join(process.env.APPDATA || process.env.LOCALAPPDATA || distributionDirectory, PRODUCT_NAME)
);

const runtime = {
  schema: path.join(__dirname, "schema.sql"),
  seed: path.join(__dirname, "seed.cjs"),
  server: path.join(distributionDirectory, "server", "apps", "web", "server.js"),
  worker: path.join(__dirname, "worker.cjs"),
  workerCli: path.join(__dirname, "worker-cli.cjs")
};

function emit(event, value = "") {
  process.stdout.write(`${event}\t${value}\n`);
}

function encodedMessage(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

async function reserveLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      if (!port) {
        server.close(() => reject(new Error("The operating system did not provide a loopback port.")));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function childEnvironment(baseEnvironment) {
  return {
    ...process.env,
    ...baseEnvironment,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1"
  };
}

function spawnNode(script, args, environment) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: path.dirname(script),
    env: childEnvironment(environment),
    windowsHide: true,
    stdio: ["ignore", logDescriptor, logDescriptor]
  });
  child.on("error", (error) => logMessage(`${path.basename(script)} failed to start`, error));
  child.on("exit", (code, signal) => {
    if (code !== 0 && !cleanupStarted) logMessage(`${path.basename(script)} exited unexpectedly`, new Error(signal || `code ${code}`));
  });
  return child;
}

function logMessage(message, error) {
  const suffix = error ? `: ${error instanceof Error ? error.message : String(error)}` : "";
  const line = `[${new Date().toISOString()}] ${message}${suffix}\n`;
  try {
    if (logDescriptor !== undefined) fs.writeSync(logDescriptor, line);
  } catch {
    // Logging must never take down the local runtime.
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function runNode(script, args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawnNode(script, args, environment);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(script)} exited with ${signal || `code ${code}`}`));
    });
  });
}

async function waitForServer(origin, child) {
  const deadline = Date.now() + 60_000;
  let spawnError;
  const onError = (error) => { spawnError = error; };
  child.once("error", onError);

  try {
    while (Date.now() < deadline) {
      if (spawnError) throw new Error(`The local web server could not start: ${errorMessage(spawnError)}`);
      if (child.exitCode !== null) throw new Error(`The local web server exited with ${child.signalCode || `code ${child.exitCode}`}.`);

      const reachable = await new Promise((resolve) => {
        const request = http.get(origin, (response) => {
          response.resume();
          resolve(true);
        });
        request.setTimeout(1_000, () => request.destroy());
        request.once("error", () => resolve(false));
      });

      if (reachable) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    child.removeListener("error", onError);
  }

  throw new Error("The local web server did not become ready within 60 seconds.");
}

function waitForSpawn(child, label) {
  return new Promise((resolve, reject) => {
    const onSpawn = () => { child.removeListener("error", onError); resolve(); };
    const onError = (error) => { child.removeListener("spawn", onSpawn); reject(new Error(`${label} could not start: ${errorMessage(error)}`)); };
    child.once("spawn", onSpawn);
    child.once("error", onError);
  });
}

async function startIngestion(environment, initial = false) {
  if (ingestionProcess && ingestionProcess.exitCode === null) {
    if (!initial) emit("STATUS", encodedMessage("An ingestion pass is already running."));
    return false;
  }

  ingestionStatus = {
    phase: "starting",
    running: true,
    totalSources: 0,
    completedSources: 0,
    activeSources: [],
    discovered: 0,
    failedSources: 0,
    partialSources: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null
  };

  ingestionProcess = spawn(process.execPath, [runtime.workerCli, "ingest"], {
    cwd: path.dirname(runtime.workerCli),
    env: childEnvironment({ ...environment, INGESTION_PROGRESS: "ipc" }),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdoutBuffer = "";
  ingestionProcess.stdout.setEncoding("utf8");
  ingestionProcess.stdout.on("data", (chunk) => {
    if (logDescriptor !== undefined) fs.writeSync(logDescriptor, chunk);
    stdoutBuffer += chunk;
    let newline;
    while ((newline = stdoutBuffer.indexOf("\n")) >= 0) {
      const line = stdoutBuffer.slice(0, newline).trim();
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      if (!line.startsWith("INGESTION_PROGRESS\t")) continue;
      try {
        const progress = JSON.parse(Buffer.from(line.slice("INGESTION_PROGRESS\t".length), "base64").toString("utf8"));
        ingestionStatus = {
          ...ingestionStatus,
          ...progress,
          running: true,
          error: null
        };
      } catch (error) {
        logMessage("Could not parse ingestion progress", error);
      }
    }
  });
  ingestionProcess.stderr.on("data", (chunk) => {
    if (logDescriptor !== undefined) fs.writeSync(logDescriptor, chunk);
  });
  ingestionProcess.on("error", (error) => logMessage("worker-cli.cjs failed to start", error));
  await waitForSpawn(ingestionProcess, initial ? "The initial local ingestion job" : "The local ingestion job");
  emit("INGESTION_STARTED", initial ? "initial" : "manual");
  ingestionProcess.once("exit", (code, signal) => {
    if (code !== 0 && !cleanupStarted) logMessage("Local ingestion job failed", new Error(signal || `code ${code}`));
    ingestionStatus = {
      ...ingestionStatus,
      phase: code === 0 ? "completed" : "failed",
      running: false,
      finishedAt: new Date().toISOString(),
      error: code === 0 ? null : `Ingestion exited with ${signal || `code ${code}`}`
    };
    emit("INGESTION_FINISHED", String(code ?? 1));
    ingestionProcess = undefined;
  });
  return true;
}

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store"
  });
  response.end(payload);
}

async function startControlServer() {
  controlServer = http.createServer((request, response) => {
    void (async () => {
      if (request.headers.authorization !== `Bearer ${controlToken}`) {
        sendJson(response, 401, { error: "Unauthorized" });
        return;
      }

      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      if (requestUrl.pathname !== "/ingestion") {
        sendJson(response, 404, { error: "Not found" });
        return;
      }
      if (request.method === "GET") {
        sendJson(response, 200, ingestionStatus);
        return;
      }
      if (request.method === "POST") {
        const started = await startIngestion(applicationEnvironment);
        sendJson(response, started ? 202 : 409, ingestionStatus);
        return;
      }
      sendJson(response, 405, { error: "Method not allowed" });
    })().catch((error) => {
      logMessage("Local control request failed", error);
      if (!response.headersSent) sendJson(response, 500, { error: errorMessage(error) });
      else response.end();
    });
  });

  await new Promise((resolve, reject) => {
    controlServer.once("error", reject);
    controlServer.listen(0, "127.0.0.1", () => {
      controlServer.removeListener("error", reject);
      resolve();
    });
  });
  const address = controlServer.address();
  if (!address || typeof address === "string") throw new Error("The local control server did not provide a port.");
  return `http://127.0.0.1:${address.port}`;
}

let applicationEnvironment;

async function startLocalService() {
  const requiredFiles = [runtime.schema, runtime.seed, runtime.server, runtime.worker, runtime.workerCli];
  const missingFile = requiredFiles.find((filePath) => !fs.existsSync(filePath));
  if (missingFile) throw new Error(`The local runtime is incomplete. Missing: ${missingFile}`);

  fs.mkdirSync(userDataDirectory, { recursive: true });
  logDescriptor = fs.openSync(path.join(userDataDirectory, "desktop-runtime.log"), "a");
  logMessage("Starting local tray service");

  database = await startEmbeddedDatabase({
    dataDirectory: path.join(userDataDirectory, "database"),
    schemaPath: runtime.schema
  });

  const webPort = await reserveLoopbackPort();
  const origin = `http://127.0.0.1:${webPort}`;
  const controlOrigin = await startControlServer();
  applicationEnvironment = {
    DATABASE_URL: database.connectionUrl,
    DIRECT_URL: database.connectionUrl,
    APP_BASE_URL: origin,
    DESKTOP_CONTROL_URL: controlOrigin,
    DESKTOP_CONTROL_TOKEN: controlToken,
    EMAIL_PROVIDER: "console",
    EMAIL_FROM: "FAANG Quant Tracker <local@localhost>",
    HOSTNAME: "127.0.0.1",
    NODE_PATH: path.join(path.dirname(runtime.server), "node_modules"),
    PORT: String(webPort)
  };

  await runNode(runtime.seed, [], applicationEnvironment);
  serverProcess = spawnNode(runtime.server, [], applicationEnvironment);
  await waitForServer(origin, serverProcess);
  serverProcess.once("exit", (code, signal) => {
    if (!cleanupStarted) reportFatal(new Error(`The local web server stopped (${signal || `code ${code}`}).`));
  });

  workerProcess = spawnNode(runtime.worker, [], applicationEnvironment);
  await waitForSpawn(workerProcess, "The local worker");
  await startIngestion(applicationEnvironment, true);

  logMessage(`Local runtime ready at ${origin}`);
  emit("READY", origin);
}

async function stopChild(child, label) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(forceTimer);
      child.removeListener("exit", finish);
      resolve();
    };
    const forceTimer = setTimeout(() => {
      if (child.exitCode === null) {
        logMessage(`Force-stopping ${label}`);
        try { child.kill("SIGKILL"); } catch (error) { logMessage(`Could not stop ${label}`, error); }
      }
      setTimeout(finish, 1_000).unref();
    }, 5_000);
    forceTimer.unref();
    child.once("exit", finish);
    try { child.kill(); } catch (error) {
      logMessage(`Could not stop ${label}`, error);
      finish();
    }
  });
}

async function cleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;

  await Promise.all([
    stopChild(ingestionProcess, "the ingestion job"),
    stopChild(workerProcess, "the worker scheduler"),
    stopChild(serverProcess, "the local web server")
  ]);

  if (controlServer) {
    await new Promise((resolve) => controlServer.close(() => resolve()));
    controlServer = undefined;
  }

  try {
    await database?.stop();
  } catch (error) {
    logMessage("Could not close the embedded database cleanly", error);
  } finally {
    if (logDescriptor !== undefined) {
      logMessage("Local runtime stopped");
      fs.closeSync(logDescriptor);
      logDescriptor = undefined;
    }
  }
}

function reportFatal(error) {
  if (cleanupStarted || fatalErrorReported) return;
  fatalErrorReported = true;
  logMessage("Fatal local runtime error", error);
  emit("ERROR", encodedMessage(`${errorMessage(error)}\n\nRuntime log: ${path.join(userDataDirectory, "desktop-runtime.log")}`));
  void cleanup().finally(() => {
    process.exit(1);
  });
}

async function handleCommand(command) {
  if (command === "ingest" && applicationEnvironment && !cleanupStarted) {
    try {
      await startIngestion(applicationEnvironment);
    } catch (error) {
      logMessage("Manual ingestion could not start", error);
      emit("STATUS", encodedMessage(`Ingestion could not start: ${errorMessage(error)}`));
    }
  } else if (command === "exit") {
    await cleanup();
    process.exit(0);
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  commandBuffer += chunk;
  let newline;
  while ((newline = commandBuffer.indexOf("\n")) >= 0) {
    const command = commandBuffer.slice(0, newline).trim().toLowerCase();
    commandBuffer = commandBuffer.slice(newline + 1);
    if (command) void handleCommand(command);
  }
});
process.stdin.on("end", () => void cleanup().finally(() => process.exit(0)));
process.on("SIGINT", () => void cleanup().finally(() => process.exit(0)));
process.on("SIGTERM", () => void cleanup().finally(() => process.exit(0)));
process.on("uncaughtException", reportFatal);
process.on("unhandledRejection", reportFatal);

startLocalService().catch(reportFatal);
