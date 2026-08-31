const path = require("node:path");
const { spawnSync } = require("node:child_process");

const webDirectory = path.join(__dirname, "..");
const workspaceDirectory = path.join(webDirectory, "..", "..");
const dotenvCli = require.resolve("dotenv-cli/cli.js");
const nextCli = require.resolve("next/dist/bin/next");
const nodeArguments = [];

// Next's standalone output contains links to traced dependencies. Regular
// symlinks require elevated privileges on Windows, while directory junctions
// work in an ordinary shell and are equivalent for this build output.
if (process.platform === "win32") {
  nodeArguments.push(
    "--require",
    path.join(workspaceDirectory, "scripts", "windows-junction-shim.cjs")
  );
}

nodeArguments.push(nextCli, "build");

const result = spawnSync(
  process.execPath,
  [
    dotenvCli,
    "-e",
    path.join(workspaceDirectory, ".env"),
    "--",
    process.execPath,
    ...nodeArguments
  ],
  {
    cwd: webDirectory,
    env: process.env,
    stdio: "inherit"
  }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
