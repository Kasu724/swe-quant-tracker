const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, dialog, Menu, session, shell } = require("electron");
const { startEmbeddedDatabase } = require("./runtime/database.cjs");

const PRODUCT_NAME = "FAANG Quant Tracker";
let database;
let serverProcess;
let workerProcess;
let ingestionProcess;
let logDescriptor;
let cleanupComplete = false;
let cleanupStarted = false;
let fatalErrorShown = false;

function getRuntimePaths() {
  if (app.isPackaged) {
    return {
      migrations: path.join(process.resourcesPath, "migrations"),
      seed: path.join(process.resourcesPath, "runtime", "seed.cjs"),
      server: path.join(process.resourcesPath, "server", "apps", "web", "server.js"),
      worker: path.join(process.resourcesPath, "runtime", "worker.cjs"),
      workerCli: path.join(process.resourcesPath, "runtime", "worker-cli.cjs")
    };
  }

  const workspace = path.join(__dirname, "..", "..");
  return {
    migrations: path.join(workspace, "packages", "db", "prisma", "migrations"),
    seed: path.join(__dirname, "build", "seed.cjs"),
    server: path.join(workspace, "apps", "web", ".next", "standalone", "apps", "web", "server.js"),
    worker: path.join(__dirname, "build", "worker.cjs"),
    workerCli: path.join(__dirname, "build", "worker-cli.cjs")
  };
}

function getLocalSecret(userDataDirectory) {
  const configPath = path.join(userDataDirectory, "desktop-config.json");

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (typeof config.nextAuthSecret === "string" && config.nextAuthSecret.length >= 32) {
      try { fs.chmodSync(configPath, 0o600); } catch { /* Windows may not support POSIX modes. */ }
      return config.nextAuthSecret;
    }
  } catch {
    // A missing or invalid local config is replaced below.
  }

  const nextAuthSecret = crypto.randomBytes(48).toString("base64url");
  const temporaryPath = `${configPath}.${process.pid}.tmp`;
  try { fs.unlinkSync(temporaryPath); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  fs.writeFileSync(temporaryPath, `${JSON.stringify({ nextAuthSecret }, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx"
  });
  try {
    fs.renameSync(temporaryPath, configPath);
  } catch (error) {
    if (!["EEXIST", "EPERM", "ENOTEMPTY"].includes(error.code)) {
      try { fs.unlinkSync(temporaryPath); } catch { /* best effort */ }
      throw error;
    }
    fs.writeFileSync(configPath, `${JSON.stringify({ nextAuthSecret }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    try { fs.unlinkSync(temporaryPath); } catch { /* best effort */ }
  }
  try { fs.chmodSync(configPath, 0o600); } catch { /* Windows may not support POSIX modes. */ }
  return nextAuthSecret;
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
    ELECTRON_RUN_AS_NODE: "1",
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

function openExternal(url) {
  try {
    const target = new URL(url);
    if (["http:", "https:"].includes(target.protocol)) void shell.openExternal(target.toString()).catch((error) => logMessage("Could not open external link", error));
  } catch (error) {
    logMessage("Rejected malformed navigation URL", error);
  }
}

async function createWindow(origin) {
  const allowedOrigin = new URL(origin).origin;
  const window = new BrowserWindow({
    title: PRODUCT_NAME,
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#0a0a0b",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false
    }
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.origin === allowedOrigin) void window.loadURL(target.toString());
      else openExternal(target.toString());
    } catch (error) {
      logMessage("Rejected malformed window-open URL", error);
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    let target;
    try { target = new URL(url); } catch (error) {
      event.preventDefault();
      logMessage("Rejected malformed navigation URL", error);
      return;
    }
    if (target.origin !== allowedOrigin) {
      event.preventDefault();
      openExternal(target.toString());
    }
  });
  window.webContents.on("will-redirect", (event, url) => {
    let target;
    try { target = new URL(url); } catch (error) {
      event.preventDefault();
      logMessage("Rejected malformed redirect URL", error);
      return;
    }
    if (target.origin !== allowedOrigin) {
      event.preventDefault();
      openExternal(target.toString());
    }
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.on("render-process-gone", (_event, details) => {
    if (!cleanupStarted) reportFatal(new Error(`The local UI stopped unexpectedly (${details.reason}).`));
  });
  await window.loadURL(origin);
  return window;
}

function waitForSpawn(child, label) {
  return new Promise((resolve, reject) => {
    const onSpawn = () => { child.removeListener("error", onError); resolve(); };
    const onError = (error) => { child.removeListener("spawn", onSpawn); reject(new Error(`${label} could not start: ${errorMessage(error)}`)); };
    child.once("spawn", onSpawn);
    child.once("error", onError);
  });
}

function reportFatal(error) {
  if (cleanupStarted || fatalErrorShown) return;
  fatalErrorShown = true;
  logMessage("Fatal desktop runtime error", error);
  const message = errorMessage(error);
  if (app.isReady()) {
    dialog.showErrorBox(PRODUCT_NAME, `${message}\n\nRuntime log: ${path.join(app.getPath("userData"), "desktop-runtime.log")}`);
  }
  void cleanup().finally(() => app.quit());
}

async function startLocalApplication() {
  const runtime = getRuntimePaths();
  const requiredFiles = [runtime.migrations, runtime.seed, runtime.server, runtime.worker, runtime.workerCli];
  const missingFile = requiredFiles.find((filePath) => !fs.existsSync(filePath));
  if (missingFile) throw new Error(`The local runtime is incomplete. Missing: ${missingFile}`);
  const userDataDirectory = app.getPath("userData");
  fs.mkdirSync(userDataDirectory, { recursive: true });
  logDescriptor = fs.openSync(path.join(userDataDirectory, "desktop-runtime.log"), "a");
  logMessage("Starting fully local desktop runtime");

  database = await startEmbeddedDatabase({
    dataDirectory: path.join(userDataDirectory, "database"),
    migrationsDirectory: runtime.migrations
  });

  const webPort = await reserveLoopbackPort();
  const origin = `http://127.0.0.1:${webPort}`;
  const environment = {
    DATABASE_URL: database.connectionUrl,
    DIRECT_URL: database.connectionUrl,
    APP_BASE_URL: origin,
    NEXTAUTH_URL: origin,
    NEXTAUTH_SECRET: getLocalSecret(userDataDirectory),
    EMAIL_PROVIDER: "console",
    EMAIL_FROM: "FAANG Quant Tracker <local@localhost>",
    HOSTNAME: "127.0.0.1",
    NODE_PATH: [
      path.join(path.dirname(runtime.server), "node_modules"),
      path.join(path.dirname(runtime.server), "..", "..", "node_modules")
    ].join(path.delimiter),
    PORT: String(webPort)
  };

  await runNode(runtime.seed, [], environment);
  serverProcess = spawnNode(runtime.server, [], environment);
  await waitForServer(origin, serverProcess);
  serverProcess.once("exit", (code, signal) => {
    if (!cleanupStarted) reportFatal(new Error(`The local web server stopped (${signal || `code ${code}`}).`));
  });

  workerProcess = spawnNode(runtime.worker, [], environment);
  await waitForSpawn(workerProcess, "The local worker");
  ingestionProcess = spawnNode(runtime.workerCli, ["ingest"], environment);
  await waitForSpawn(ingestionProcess, "The initial local ingestion job");
  ingestionProcess.once("exit", (code, signal) => {
    if (code !== 0 && !cleanupStarted) logMessage("Initial local ingestion job failed", new Error(signal || `code ${code}`));
    ingestionProcess = undefined;
  });

  await createWindow(origin);
  logMessage(`Local runtime ready at ${origin}`);
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
    stopChild(ingestionProcess, "the initial ingestion job"),
    stopChild(workerProcess, "the worker scheduler"),
    stopChild(serverProcess, "the local web server")
  ]);

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
    cleanupComplete = true;
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId("com.kasu724.faangquanttracker");

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: "File", submenu: [{ role: "quit" }] },
      { label: "View", submenu: [{ role: "reload" }, { role: "forceReload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }] },
      { label: "Help", submenu: [{ label: "Project on GitHub", click: () => void shell.openExternal("https://github.com/Kasu724/faang-quant-tracker") }] }
    ]));

    try {
      await startLocalApplication();
    } catch (error) {
      reportFatal(error);
    }
  });

  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.on("activate", () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) window.show();
  });

  app.on("window-all-closed", () => app.quit());

  app.on("before-quit", (event) => {
    if (cleanupComplete) return;
    event.preventDefault();
    void cleanup().finally(() => app.quit());
  });

  process.on("uncaughtException", reportFatal);
  process.on("unhandledRejection", reportFatal);
}
