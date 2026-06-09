import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sourceUrl = process.env.LOCAL_DATABASE_URL;
const destinationUrl = process.env.DIRECT_URL;
const isWindows = process.platform === "win32";

if (!sourceUrl) {
  throw new Error("Set LOCAL_DATABASE_URL to the existing PostgreSQL connection string.");
}

if (!destinationUrl) {
  throw new Error("Set DIRECT_URL to the Supabase direct/session connection string.");
}

if (sourceUrl === destinationUrl) {
  throw new Error("LOCAL_DATABASE_URL and DIRECT_URL must be different.");
}

const commands = {
  docker: isWindows ? "docker.exe" : "docker",
  pgDump: isWindows ? "pg_dump.exe" : "pg_dump",
  pnpm: isWindows ? "pnpm.cmd" : "pnpm",
  psql: isWindows ? "psql.exe" : "psql"
};
const dumpFileName = `faang-quant-tracker-${randomUUID()}.sql`;
const dumpPath = path.join(os.tmpdir(), dumpFileName);
const containerDumpPath = `/work/${dumpFileName}`;
const hasNativePostgresTools =
  commandAvailable(commands.pgDump) && commandAvailable(commands.psql);
const hasDocker = commandAvailable(commands.docker);

if (!hasNativePostgresTools && !hasDocker) {
  throw new Error(
    "Install the PostgreSQL client tools or Docker, then ensure the commands are available on PATH."
  );
}

if (!hasNativePostgresTools) {
  console.log("PostgreSQL client tools were not found; using the postgres:16 Docker image.");
}

function commandAvailable(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    shell: options.shell ?? false,
    stdio: options.capture ? "pipe" : "inherit"
  });

  if (result.error?.code === "ENOENT") {
    throw new Error(`${command} was not found on PATH.`);
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const detail = options.capture ? result.stderr.trim() : "";
    throw new Error(`${command} exited with code ${result.status}.${detail ? ` ${detail}` : ""}`);
  }

  return result.stdout?.trim() ?? "";
}

function runPostgresTool(tool, args, options = {}) {
  const normalizedArgs = args.map((argument) => {
    if (argument.startsWith("--dbname=")) {
      return `--dbname=${toPostgresClientUrl(argument.slice("--dbname=".length))}`;
    }

    return argument;
  });

  if (hasNativePostgresTools) {
    return run(commands[tool], normalizedArgs, options);
  }

  const dockerArgs = normalizedArgs.map((argument) => {
    if (argument === `--file=${dumpPath}`) {
      return `--file=${containerDumpPath}`;
    }

    if (argument.startsWith("--dbname=")) {
      return `--dbname=${rewriteLocalhostForDocker(argument.slice("--dbname=".length))}`;
    }

    return argument;
  });

  return run(
    commands.docker,
    [
      "run",
      "--rm",
      "--add-host=host.docker.internal:host-gateway",
      "--volume",
      `${os.tmpdir()}:/work`,
      "postgres:16",
      tool === "pgDump" ? "pg_dump" : "psql",
      ...dockerArgs
    ],
    options
  );
}

function toPostgresClientUrl(connectionString) {
  const url = new URL(connectionString);

  for (const parameter of [
    "connection_limit",
    "pgbouncer",
    "pool_timeout",
    "schema",
    "socket_timeout"
  ]) {
    url.searchParams.delete(parameter);
  }

  return url.toString();
}

function rewriteLocalhostForDocker(connectionString) {
  const url = new URL(connectionString);

  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    url.hostname = "host.docker.internal";
  }

  return url.toString();
}

try {
  const tableCountOutput = runPostgresTool(
    "psql",
    [
      `--dbname=${destinationUrl}`,
      "--tuples-only",
      "--no-align",
      "--set=ON_ERROR_STOP=1",
      "--command=SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
    ],
    { capture: true }
  );
  const tableCount = Number.parseInt(tableCountOutput, 10);

  if (!Number.isInteger(tableCount)) {
    throw new Error("Could not determine whether the destination database is empty.");
  }

  if (tableCount > 0) {
    throw new Error(
      `The destination public schema already contains ${tableCount} table(s). Use a fresh Supabase project or migrate it manually.`
    );
  }

  console.log("Applying committed Prisma migrations to Supabase...");
  run(
    commands.pnpm,
    ["exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: path.resolve("packages/db"),
      env: {
        ...process.env,
        DATABASE_URL: destinationUrl,
        DIRECT_URL: destinationUrl
      },
      shell: isWindows
    }
  );

  console.log("Exporting application data from the existing database...");
  runPostgresTool("pgDump", [
    `--dbname=${sourceUrl}`,
    "--schema=public",
    "--data-only",
    "--exclude-table=public._prisma_migrations",
    "--no-owner",
    "--no-acl",
    "--format=plain",
    `--file=${dumpPath}`
  ]);

  console.log("Importing application data into Supabase...");
  runPostgresTool("psql", [
    `--dbname=${destinationUrl}`,
    "--set=ON_ERROR_STOP=1",
    `--file=${dumpPath}`
  ]);

  console.log("Database copy completed. Point DATABASE_URL at Supabase and run pnpm db:check.");
} finally {
  if (fs.existsSync(dumpPath)) {
    fs.rmSync(dumpPath);
  }
}
