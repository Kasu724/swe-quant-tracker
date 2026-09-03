const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const executable = path.resolve(process.argv[2] || path.join(__dirname, "..", "..", "..", "dist", "desktop", "win-unpacked", "SWEQuantTracker.exe"));
const timeoutMs = Number(process.env.DESKTOP_SMOKE_TIMEOUT_MS || 90_000);
if (process.platform !== "win32") throw new Error("The packaged desktop smoke test currently requires Windows.");
if (!fs.existsSync(executable)) throw new Error(`Packaged executable not found: ${executable}`);

function listeningPorts() {
  const output = execFileSync("netstat.exe", ["-ano", "-p", "tcp"], { encoding: "utf8", windowsHide: true });
  const ports = new Set();
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^(?:TCP)\s+(?:127\.0\.0\.1|\[?::1\]?):(\d+)\s+\S+\s+LISTENING\s+\d+$/i);
    if (match) ports.add(Number(match[1]));
  }
  return ports;
}

function get(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });
    request.setTimeout(1_000, () => request.destroy());
    request.once("error", () => resolve(false));
  });
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const request = http.request(url, {
      method: options.method || "GET",
      headers: body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : undefined
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { responseBody += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: responseBody }));
    });
    request.setTimeout(5_000, () => request.destroy(new Error(`Timed out requesting ${url}`)));
    request.once("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

async function verifyLocalFeatures(origin) {
  const ingestion = await request(`${origin}/api/ingestion`);
  if (ingestion.status !== 200 || typeof JSON.parse(ingestion.body).running !== "boolean") {
    throw new Error(`Ingestion status endpoint failed (${ingestion.status}): ${ingestion.body}`);
  }

  const trigger = await request(`${origin}/api/ingestion`, { method: "POST" });
  if (trigger.status !== 202 && trigger.status !== 409) {
    throw new Error(`Ingestion trigger endpoint failed (${trigger.status}): ${trigger.body}`);
  }

  const backup = await request(`${origin}/api/portable-data/export?theme=dark`);
  const backupData = JSON.parse(backup.body);
  if (
    backup.status !== 200 ||
    backupData.format !== "swe-quant-tracker-backup" ||
    backupData.version !== 1 ||
    backupData.settings?.theme !== "dark"
  ) {
    throw new Error(`Portable backup endpoint returned an invalid document (${backup.status}).`);
  }

  const imported = await request(`${origin}/api/portable-data/import`, {
    method: "POST",
    body: { data: backupData, replacePersonalData: false }
  });
  if (imported.status !== 200 || !JSON.parse(imported.body).result) {
    throw new Error(`Portable backup import failed (${imported.status}): ${imported.body}`);
  }

  const removedAuthPage = await request(`${origin}/auth/signin`);
  if (removedAuthPage.status !== 404) {
    throw new Error(`Removed sign-in page unexpectedly returned ${removedAuthPage.status}.`);
  }
}

function readLog(logPath) {
  try { return fs.readFileSync(logPath, "utf8"); } catch { return ""; }
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  try { execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); } catch {}
}

async function main() {
  const baselinePorts = listeningPorts();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "faang-quant-desktop-smoke-"));
  const logPath = path.join(userData, "desktop-runtime.log");
  const child = spawn(executable, [`--user-data-dir=${userData}`, "--no-open-browser", "--allow-multiple"], { windowsHide: true, stdio: "ignore" });
  let success = false;
  let failure;
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const log = readLog(logPath);
      if (/Cannot find module|uncaught exception|Error:|did not become ready|exited with code|failed to/i.test(log)) {
        throw new Error(`Desktop runtime reported an error.\n${log.slice(-4_000)}`);
      }
      if (child.exitCode !== null) throw new Error(`Packaged executable exited with code ${child.exitCode}.\n${log.slice(-4_000)}`);
      const candidates = [...listeningPorts()].filter((port) => !baselinePorts.has(port));
      for (const port of candidates) {
        const origin = `http://127.0.0.1:${port}`;
        if (await get(`${origin}/`)) {
          await verifyLocalFeatures(origin);
          success = true;
          console.log(`Packaged desktop runtime and local APIs are healthy on ${origin} (pid ${child.pid}).`);
          break;
        }
      }
      if (success) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!success) throw new Error(`Timed out after ${timeoutMs}ms waiting for the packaged local server.\n${readLog(logPath).slice(-4_000)}`);
  } catch (error) {
    failure = error;
  } finally {
    stopProcess(child);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
  }
  if (failure) throw failure;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
