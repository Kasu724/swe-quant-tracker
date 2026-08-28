const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const executable = path.resolve(process.argv[2] || path.join(__dirname, "..", "..", "..", "dist", "desktop", "win-unpacked", "FAANGQuantTracker.exe"));
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
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.setTimeout(1_000, () => request.destroy());
    request.once("error", () => resolve(false));
  });
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
  const child = spawn(executable, [`--user-data-dir=${userData}`], { windowsHide: true, stdio: "ignore" });
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
        if (await get(`http://127.0.0.1:${port}/`)) {
          success = true;
          console.log(`Packaged desktop runtime is healthy on http://127.0.0.1:${port} (pid ${child.pid}).`);
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
