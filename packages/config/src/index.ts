import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const numericString = z.coerce.number().int().positive();
const discordWebhookUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .url()
    .superRefine((value, context) => {
      const url = new URL(value);
      const allowedHosts = new Set([
        "discord.com",
        "discordapp.com",
        "canary.discord.com",
        "ptb.discord.com"
      ]);

      if (
        url.protocol !== "https:" ||
        Boolean(url.username || url.password) ||
        !allowedHosts.has(url.hostname.toLowerCase()) ||
        !/^\/api(?:\/v\d+)?\/webhooks\/[^/]+\/[^/]+\/?$/.test(url.pathname)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be an HTTPS Discord webhook URL"
        });
      }
    })
    .optional()
);
let hasAttemptedEnvLoad = false;

function findWorkspaceRoot(startDirectory: string): string | null {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (fs.existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function parseEnvAssignment(line: string): { key: string; value: string } | null {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  let value = trimmedLine.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, "utf8");

  for (const line of fileContents.split(/\r?\n/)) {
    const assignment = parseEnvAssignment(line);

    if (!assignment || process.env[assignment.key] !== undefined) {
      continue;
    }

    process.env[assignment.key] = assignment.value;
  }
}

export function ensureRepoEnvLoaded() {
  if (hasAttemptedEnvLoad) {
    return;
  }

  hasAttemptedEnvLoad = true;

  const candidateRoots = [process.cwd(), __dirname]
    .map((directory) => findWorkspaceRoot(directory))
    .filter((directory): directory is string => Boolean(directory));

  for (const rootDirectory of new Set(candidateRoots)) {
    const envPath = path.join(rootDirectory, ".env");

    if (!fs.existsSync(envPath)) {
      continue;
    }

    loadEnvFile(envPath);
    return;
  }
}

const baseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_FROM: z.string().min(1).default("SWE-Quant Tracker <noreply@example.com>"),
  EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  SMTP_URL: z.string().optional(),
  LISTING_NEW_DAYS: numericString.default(7),
  POSTING_STALE_DAYS: numericString.default(7)
});

const webEnvSchema = baseEnvSchema;

const workerEnvSchema = baseEnvSchema.extend({
  POLL_CRON: z.string().default("*/30 * * * *"),
  DAILY_DIGEST_CRON: z.string().default("0 8 * * *"),
  DISCORD_NOTIFICATION_CRON: z.string().default("* * * * *"),
  INGESTION_CONCURRENCY: numericString.default(2),
  INGESTION_URL_VALIDATION_CONCURRENCY: numericString.max(20).default(5),
  INGESTION_REQUEST_TIMEOUT_MS: numericString.default(20_000),
  INGESTION_SOURCE_TIMEOUT_MS: numericString.default(120_000),
  DISCORD_WEBHOOK_URL: discordWebhookUrl,
  DISCORD_WEBHOOK_TIMEOUT_MS: numericString.max(60_000).default(5_000),
  DISCORD_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  DISCORD_NOTIFICATION_BATCH_SIZE: numericString.max(100).default(25)
});

const seedEnvSchema = baseEnvSchema;

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;
export type SeedEnv = z.infer<typeof seedEnvSchema>;

export function readBaseEnv(input: NodeJS.ProcessEnv = process.env): BaseEnv {
  ensureRepoEnvLoaded();
  return baseEnvSchema.parse(input);
}

export function readWebEnv(input: NodeJS.ProcessEnv = process.env): WebEnv {
  ensureRepoEnvLoaded();
  return webEnvSchema.parse(input);
}

export function readWorkerEnv(input: NodeJS.ProcessEnv = process.env): WorkerEnv {
  ensureRepoEnvLoaded();
  return workerEnvSchema.parse(input);
}

export function readSeedEnv(input: NodeJS.ProcessEnv = process.env): SeedEnv {
  ensureRepoEnvLoaded();
  return seedEnvSchema.parse(input);
}
