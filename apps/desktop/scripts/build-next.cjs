const path = require("node:path");
const { spawnSync } = require("node:child_process");

const junctionShim = path.join(__dirname, "windows-junction-shim.cjs");
const existingNodeOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : "";
const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) throw new Error("pnpm executable path is unavailable");

const result = spawnSync(process.execPath, [pnpmEntry, "--filter", "@faang-quant/web", "build"], {
  cwd: path.join(__dirname, "..", "..", ".."),
  env: {
    ...process.env,
    NODE_OPTIONS: process.platform === "win32"
      ? `${existingNodeOptions}--require=${junctionShim}`
      : process.env.NODE_OPTIONS
  },
  stdio: "inherit"
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
