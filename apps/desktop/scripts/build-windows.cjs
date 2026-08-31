const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { getMakeNsisPath } = require("app-builder-lib/out/toolsets/windows");

const desktopDirectory = path.join(__dirname, "..");
const workspaceDirectory = path.join(desktopDirectory, "..", "..");
const outputDirectory = path.join(workspaceDirectory, "dist", "desktop");
const stageDirectory = path.join(outputDirectory, "win-unpacked");
const runtimeDirectory = path.join(stageDirectory, "runtime");
const packageJson = require(path.join(desktopDirectory, "package.json"));
const version = packageJson.version;
const fileVersion = `${version.split(".").slice(0, 3).join(".")}.0`;
const directoryOnly = process.argv.includes("--dir");
const launchAfterBuild = process.argv.includes("--launch");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: workspaceDirectory,
    env: { ...process.env, ...(options.env || {}) },
    stdio: "inherit",
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} exited with code ${result.status ?? "unknown"}`);
}

function copy(source, destination) {
  if (!fs.existsSync(source)) throw new Error(`Missing build input: ${source}`);
  fs.cpSync(source, destination, { recursive: true, force: true, dereference: true });
}

function copyPackage(packageName) {
  let packageDirectory = path.dirname(require.resolve(packageName, { paths: [desktopDirectory] }));
  while (!fs.existsSync(path.join(packageDirectory, "package.json"))) {
    const parent = path.dirname(packageDirectory);
    if (parent === packageDirectory) throw new Error(`Could not locate ${packageName}'s package directory.`);
    packageDirectory = parent;
  }
  const destination = path.join(runtimeDirectory, "node_modules", ...packageName.split("/"));
  copy(packageDirectory, destination);
}

function verifiedOutputPath(target) {
  const resolvedOutput = path.resolve(outputDirectory);
  const resolvedTarget = path.resolve(target);
  if (path.dirname(resolvedTarget) !== resolvedOutput) {
    throw new Error(`Refusing to replace a path outside the desktop output directory: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function removeObsoleteArtifacts() {
  const obsoleteNames = [
    ".icon-ico",
    "builder-debug.yml",
    `FAANG-Quant-Tracker-Portable-${version}-x64.exe`,
    `FAANG-Quant-Tracker-Setup-${version}-x64.exe.blockmap`
  ];
  for (const name of obsoleteNames) {
    fs.rmSync(verifiedOutputPath(path.join(outputDirectory, name)), { recursive: true, force: true });
  }
}

function removeRuntimeOnlyFiles(rootDirectory) {
  for (const entry of fs.readdirSync(rootDirectory, { withFileTypes: true })) {
    const entryPath = path.join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      removeRuntimeOnlyFiles(entryPath);
    } else if (entry.name.endsWith(".map") || entry.name.endsWith(".d.ts") || entry.name.endsWith(".d.cts")) {
      fs.rmSync(entryPath, { force: true });
    }
  }
}

function pruneServerRuntime() {
  const nodeModules = path.join(stageDirectory, "server", "apps", "web", "node_modules");
  removeRuntimeOnlyFiles(nodeModules);

  // The generated PostgreSQL client uses only runtime/library.js. The other
  // Prisma runtime files are browser/edge clients and engines for databases
  // that this local service never loads.
  const prismaRuntime = path.join(nodeModules, "@prisma", "client", "runtime");
  for (const entry of fs.readdirSync(prismaRuntime, { withFileTypes: true })) {
    if (entry.name !== "library.js") fs.rmSync(path.join(prismaRuntime, entry.name), { recursive: true, force: true });
  }
  fs.rmSync(path.join(nodeModules, "@prisma", "client", "generator-build"), { recursive: true, force: true });
  fs.rmSync(path.join(nodeModules, "typescript"), { recursive: true, force: true });
}

function stageRuntime() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  removeObsoleteArtifacts();
  fs.rmSync(verifiedOutputPath(stageDirectory), { recursive: true, force: true });
  fs.mkdirSync(runtimeDirectory, { recursive: true });

  copy(process.execPath, path.join(runtimeDirectory, "node.exe"));
  copy(path.join(desktopDirectory, "service.cjs"), path.join(runtimeDirectory, "service.cjs"));
  copy(path.join(desktopDirectory, "runtime", "database.cjs"), path.join(runtimeDirectory, "database.cjs"));
  copy(path.join(desktopDirectory, "build", "seed.cjs"), path.join(runtimeDirectory, "seed.cjs"));
  copy(path.join(desktopDirectory, "build", "worker.cjs"), path.join(runtimeDirectory, "worker.cjs"));
  copy(path.join(desktopDirectory, "build", "worker-cli.cjs"), path.join(runtimeDirectory, "worker-cli.cjs"));
  copyPackage("@electric-sql/pglite");
  copyPackage("@electric-sql/pglite-socket");

  copy(
    path.join(workspaceDirectory, "apps", "web", ".next", "standalone", "apps", "web"),
    path.join(stageDirectory, "server", "apps", "web")
  );
  pruneServerRuntime();
  copy(path.join(workspaceDirectory, "packages", "db", "prisma", "migrations"), path.join(stageDirectory, "migrations"));
}

function compileLauncher() {
  if (process.platform !== "win32") throw new Error("The Windows tray launcher must be built on Windows.");
  const compilerCandidates = [
    path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework", "v4.0.30319", "csc.exe")
  ];
  const compiler = compilerCandidates.find((candidate) => fs.existsSync(candidate));
  if (!compiler) throw new Error("The Windows .NET Framework C# compiler was not found.");

  run(compiler, [
    "/nologo",
    "/target:winexe",
    "/platform:x64",
    "/optimize+",
    `/win32manifest:${path.join(desktopDirectory, "launcher", "app.manifest")}`,
    `/win32icon:${path.join(desktopDirectory, "build", "icon.ico")}`,
    `/out:${path.join(stageDirectory, "FAANGQuantTracker.exe")}`,
    "/reference:System.dll",
    "/reference:System.Core.dll",
    "/reference:System.Drawing.dll",
    "/reference:System.Windows.Forms.dll",
    path.join(desktopDirectory, "launcher", "Launcher.cs")
  ]);
}

async function buildInstaller() {
  const installerPath = path.join(outputDirectory, `FAANG-Quant-Tracker-Setup-${version}-x64.exe`);
  fs.rmSync(verifiedOutputPath(installerPath), { force: true });
  const makensis = await getMakeNsisPath();
  run(makensis.path, [
    "/NOCD",
    `/DAPP_VERSION=${version}`,
    `/DFILE_VERSION=${fileVersion}`,
    `/DSTAGE_DIR=${stageDirectory}`,
    `/DOUT_FILE=${installerPath}`,
    `/DAPP_ICON=${path.join(desktopDirectory, "build", "icon.ico")}`,
    path.join(desktopDirectory, "installer.nsi")
  ], { env: makensis.env });
}

function buildPortableArchive() {
  const archivePath = path.join(outputDirectory, `FAANG-Quant-Tracker-Portable-${version}-x64.zip`);
  fs.rmSync(verifiedOutputPath(archivePath), { force: true });
  run("tar.exe", ["-a", "-c", "-f", archivePath, "-C", stageDirectory, "."]);
}

async function main() {
  stageRuntime();
  compileLauncher();

  if (!directoryOnly) {
    await buildInstaller();
    buildPortableArchive();
  }

  if (launchAfterBuild) {
    const child = require("node:child_process").spawn(path.join(stageDirectory, "FAANGQuantTracker.exe"), [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
