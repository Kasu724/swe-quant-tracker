import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type IngestionStatus = {
  phase: "idle" | "starting" | "running" | "completed" | "failed";
  running: boolean;
  totalSources: number;
  completedSources: number;
  activeSources: string[];
  discovered: number;
  failedSources: number;
  partialSources: number;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
};

type DevelopmentIngestionState = {
  child?: ChildProcessWithoutNullStreams;
  status: IngestionStatus;
};

declare global {
  var __faangQuantIngestion__: DevelopmentIngestionState | undefined;
}

const idleStatus: IngestionStatus = {
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

function developmentState() {
  global.__faangQuantIngestion__ ??= { status: { ...idleStatus } };
  return global.__faangQuantIngestion__;
}

async function desktopRequest(method: "GET" | "POST") {
  const controlUrl = process.env.DESKTOP_CONTROL_URL;
  const token = process.env.DESKTOP_CONTROL_TOKEN;
  if (!controlUrl || !token) return null;

  const response = await fetch(`${controlUrl}/ingestion`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const status = (await response.json()) as IngestionStatus;
  return { status, started: response.status === 202 };
}

function findWorkspaceRoot(startDirectory: string) {
  let current = path.resolve(startDirectory);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Could not locate the workspace root for ingestion.");
    current = parent;
  }
}

function consumeProgressLine(state: DevelopmentIngestionState, line: string) {
  if (!line.startsWith("INGESTION_PROGRESS\t")) return;
  try {
    const progress = JSON.parse(
      Buffer.from(line.slice("INGESTION_PROGRESS\t".length), "base64").toString("utf8")
    ) as Partial<IngestionStatus>;
    state.status = { ...state.status, ...progress, running: true, error: null };
  } catch {
    // Worker logs remain useful even if one optional progress message is malformed.
  }
}

function startDevelopmentIngestion() {
  const state = developmentState();
  if (state.child && state.child.exitCode === null) return false;

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(command, ["--filter", "@faang-quant/worker", "ingest"], {
    cwd: workspaceRoot,
    env: { ...process.env, INGESTION_PROGRESS: "ipc" },
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"]
  });
  state.child = child;
  state.status = {
    ...idleStatus,
    phase: "starting",
    running: true,
    startedAt: new Date().toISOString()
  };

  let outputBuffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    outputBuffer += chunk;
    let newline;
    while ((newline = outputBuffer.indexOf("\n")) >= 0) {
      consumeProgressLine(state, outputBuffer.slice(0, newline).trim());
      outputBuffer = outputBuffer.slice(newline + 1);
    }
  });
  child.stderr.resume();
  child.once("error", (error) => {
    state.status = {
      ...state.status,
      phase: "failed",
      running: false,
      finishedAt: new Date().toISOString(),
      error: error.message
    };
  });
  child.once("exit", (code, signal) => {
    state.status = {
      ...state.status,
      phase: code === 0 ? "completed" : "failed",
      running: false,
      finishedAt: new Date().toISOString(),
      error: code === 0 ? null : `Ingestion exited with ${signal || `code ${code}`}`
    };
    state.child = undefined;
  });
  return true;
}

export async function getIngestionStatus() {
  const desktop = await desktopRequest("GET");
  return desktop?.status ?? developmentState().status;
}

export async function requestIngestion() {
  const desktop = await desktopRequest("POST");
  if (desktop) return desktop;

  const started = startDevelopmentIngestion();
  return { status: developmentState().status, started };
}
