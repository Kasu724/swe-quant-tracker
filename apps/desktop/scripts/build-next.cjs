const path = require("node:path");
const { spawnSync } = require("node:child_process");

const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) throw new Error("pnpm executable path is unavailable");

const result = spawnSync(process.execPath, [pnpmEntry, "--filter", "@swe-quant/web", "build"], {
  cwd: path.join(__dirname, "..", "..", ".."),
  env: process.env,
  stdio: "inherit"
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
