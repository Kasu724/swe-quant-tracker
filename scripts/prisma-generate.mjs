#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbDirectory = path.join(repoRoot, "packages", "db");

loadEnvFile(path.join(repoRoot, ".env"));

if (process.platform === "win32") {
  stopWindowsRepoDevProcesses(repoRoot);
}

const prismaCommand = path.join(
  dbDirectory,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.CMD" : "prisma"
);
const result = spawnSync(
  prismaCommand,
  ["generate", "--schema", "prisma/schema.prisma"],
  {
    cwd: dbDirectory,
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit"
  }
);

if (result.error) {
  console.error(`[prisma-generate] Failed to start Prisma: ${result.error.message}`);
}

process.exit(result.status ?? 1);

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmedLine);

    if (!match || process.env[match[1]] !== undefined) {
      continue;
    }

    process.env[match[1]] = unquoteEnvValue(match[2]);
  }
}

function unquoteEnvValue(value) {
  const trimmedValue = value.trim();
  const quote = trimmedValue[0];

  if (
    (quote === "\"" || quote === "'") &&
    trimmedValue.endsWith(quote) &&
    trimmedValue.length >= 2
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function stopWindowsRepoDevProcesses(rootDirectory) {
  const processes = listWindowsProcesses();
  const byPid = new Map(processes.map((processInfo) => [processInfo.processId, processInfo]));
  const childrenByParent = new Map();
  const selectedPids = new Set();
  const normalizedRoot = normalizeForSearch(rootDirectory);

  for (const processInfo of processes) {
    if (!childrenByParent.has(processInfo.parentProcessId)) {
      childrenByParent.set(processInfo.parentProcessId, []);
    }

    childrenByParent.get(processInfo.parentProcessId).push(processInfo.processId);

    if (isDirectRepoDevProcess(processInfo, normalizedRoot)) {
      selectedPids.add(processInfo.processId);
      selectDevAncestors(processInfo, byPid, selectedPids);
    }
  }

  expandSelectedChildren(selectedPids, childrenByParent);
  selectedPids.delete(process.pid);

  const rootPids = [...selectedPids]
    .filter((pid) => {
      const processInfo = byPid.get(pid);
      return processInfo && !selectedPids.has(processInfo.parentProcessId);
    })
    .sort((left, right) => left - right);

  if (rootPids.length === 0) {
    return;
  }

  console.log(
    `[prisma-generate] Stopping ${rootPids.length} repo dev process tree(s) before Prisma generate.`
  );

  for (const pid of rootPids) {
    const taskkill = spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      encoding: "utf8"
    });

    if (taskkill.status !== 0) {
      const message = (taskkill.stderr || taskkill.stdout || "").trim();
      console.warn(`[prisma-generate] Could not stop process ${pid}: ${message}`);
    }
  }
}

function listWindowsProcesses() {
  const script = [
    "Get-CimInstance Win32_Process",
    "| Where-Object { $_.Name -in @('node.exe','cmd.exe','powershell.exe','pwsh.exe') }",
    "| Select-Object ProcessId,ParentProcessId,Name,CommandLine",
    "| ConvertTo-Json -Compress"
  ].join(" ");

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      encoding: "utf8"
    }
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    console.warn(`[prisma-generate] Could not inspect Windows processes: ${error.message}`);
    return [];
  }

  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows.map((row) => ({
    processId: Number(row.ProcessId),
    parentProcessId: Number(row.ParentProcessId),
    name: String(row.Name ?? ""),
    commandLine: String(row.CommandLine ?? "")
  }));
}

function isDirectRepoDevProcess(processInfo, normalizedRoot) {
  const commandLine = normalizeForSearch(processInfo.commandLine);

  if (!commandLine.includes(normalizedRoot)) {
    return false;
  }

  return (
    /next(?:\.cmd)?[^a-z0-9]+dev/i.test(commandLine) ||
    /next[\\/]dist[\\/](?:bin[\\/]next|server[\\/]lib[\\/]start-server\.js)/i.test(commandLine) ||
    /tsx[^a-z0-9]+watch[^a-z0-9]+src[\\/]index\.ts/i.test(commandLine)
  );
}

function selectDevAncestors(processInfo, byPid, selectedPids) {
  let parent = byPid.get(processInfo.parentProcessId);

  while (parent && isDevAncestorProcess(parent)) {
    selectedPids.add(parent.processId);
    parent = byPid.get(parent.parentProcessId);
  }
}

function isDevAncestorProcess(processInfo) {
  const commandLine = normalizeForSearch(processInfo.commandLine);

  return (
    /pnpm(?:\.mjs|\.cjs)?["'\s\\/.:-]+(?:dev:web|dev:worker)/i.test(commandLine) ||
    /pnpm(?:\.mjs|\.cjs)?["'\s\\/.:-]+--filter[^"]+@faang-quant[\\/](?:web|worker)[^"]+dev/i.test(
      commandLine
    ) ||
    /dotenv[^"]+(?:next[^a-z0-9]+dev|tsx[^a-z0-9]+watch)/i.test(commandLine) ||
    /next(?:\.cmd)?[^a-z0-9]+dev/i.test(commandLine) ||
    /tsx[^a-z0-9]+watch/i.test(commandLine)
  );
}

function expandSelectedChildren(selectedPids, childrenByParent) {
  const queue = [...selectedPids];

  for (let index = 0; index < queue.length; index += 1) {
    const parentPid = queue[index];

    for (const childPid of childrenByParent.get(parentPid) ?? []) {
      if (!selectedPids.has(childPid)) {
        selectedPids.add(childPid);
        queue.push(childPid);
      }
    }
  }
}

function normalizeForSearch(value) {
  return value.toLowerCase().replaceAll("/", "\\");
}
