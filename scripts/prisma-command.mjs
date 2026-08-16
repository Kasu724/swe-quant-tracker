#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbDirectory = path.join(repoRoot, "packages", "db");

loadEnvFile(path.join(repoRoot, ".env"));

// Local PostgreSQL uses one connection URL for both application traffic and
// migrations. Hosted poolers can still provide an explicit DIRECT_URL.
process.env.DIRECT_URL ||= process.env.DATABASE_URL;

const prismaCommand = path.join(
  dbDirectory,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.CMD" : "prisma"
);
const result = spawnSync(prismaCommand, process.argv.slice(2), {
  cwd: dbDirectory,
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit"
});

if (result.error) {
  console.error(`[prisma-command] Failed to start Prisma: ${result.error.message}`);
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
