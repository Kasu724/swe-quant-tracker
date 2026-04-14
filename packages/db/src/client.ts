import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

declare global {
  var __faangQuantPrisma__: PrismaClient | undefined;
}

let hasAttemptedEnvLoad = false;

function ensureRepoEnvLoaded() {
  if (hasAttemptedEnvLoad) {
    return;
  }

  hasAttemptedEnvLoad = true;

  let currentDirectory = path.resolve(__dirname);

  while (true) {
    const workspacePath = path.join(currentDirectory, "pnpm-workspace.yaml");
    const envPath = path.join(currentDirectory, ".env");

    if (fs.existsSync(workspacePath)) {
      if (fs.existsSync(envPath)) {
        const fileContents = fs.readFileSync(envPath, "utf8");

        for (const line of fileContents.split(/\r?\n/)) {
          const trimmedLine = line.trim();

          if (!trimmedLine || trimmedLine.startsWith("#")) {
            continue;
          }

          const separatorIndex = trimmedLine.indexOf("=");

          if (separatorIndex <= 0) {
            continue;
          }

          const key = trimmedLine.slice(0, separatorIndex).trim();

          if (process.env[key] !== undefined) {
            continue;
          }

          let value = trimmedLine.slice(separatorIndex + 1).trim();

          if (
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          process.env[key] = value;
        }
      }

      return;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return;
    }

    currentDirectory = parentDirectory;
  }
}

ensureRepoEnvLoaded();

const prismaClient =
  global.__faangQuantPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__faangQuantPrisma__ = prismaClient;
}

export const prisma = prismaClient;
