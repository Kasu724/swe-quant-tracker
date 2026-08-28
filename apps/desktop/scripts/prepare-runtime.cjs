const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const sharp = require("sharp");

const desktopDirectory = path.join(__dirname, "..");
const workspaceDirectory = path.join(desktopDirectory, "..", "..");
const outputDirectory = path.join(desktopDirectory, "build");
const webDirectory = path.join(workspaceDirectory, "apps", "web");
const standaloneWebDirectory = path.join(webDirectory, ".next", "standalone", "apps", "web");

function materializeJunctions(rootDirectory) {
  const junctions = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      const stats = fs.lstatSync(entryPath);
      if (stats.isSymbolicLink()) junctions.push(entryPath);
      else if (stats.isDirectory()) visit(entryPath);
    }
  }

  visit(rootDirectory);

  for (const junction of junctions) {
    if (!fs.lstatSync(junction).isSymbolicLink()) continue;
    const target = fs.realpathSync(junction);
    fs.unlinkSync(junction);
    fs.cpSync(target, junction, { recursive: true, dereference: true });
  }
}

function assertNoJunctions(rootDirectory) {
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      const stats = fs.lstatSync(entryPath);
      if (stats.isSymbolicLink()) {
        throw new Error(`The standalone runtime still contains a junction: ${entryPath}`);
      }
      if (stats.isDirectory()) visit(entryPath);
    }
  }

  visit(rootDirectory);
}

function flattenTracedModules(standaloneDirectory, destinationNodeModules) {
  const pnpmDirectory = path.join(standaloneDirectory, "node_modules", ".pnpm");
  const packageSources = new Map();

  function collectFromNodeModules(nodeModulesDirectory) {
    if (!fs.existsSync(nodeModulesDirectory)) return;

    for (const entry of fs.readdirSync(nodeModulesDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === ".bin" || entry.name === ".pnpm") continue;
      const entryPath = path.join(nodeModulesDirectory, entry.name);

      if (entry.name.startsWith("@")) {
        for (const scopedEntry of fs.readdirSync(entryPath, { withFileTypes: true })) {
          if (scopedEntry.isDirectory()) {
            packageSources.set(`${entry.name}/${scopedEntry.name}`, path.join(entryPath, scopedEntry.name));
          }
        }
      } else if (entry.name !== ".prisma") {
        packageSources.set(entry.name, entryPath);
      }
    }
  }

  collectFromNodeModules(path.join(standaloneDirectory, "node_modules"));
  if (fs.existsSync(pnpmDirectory)) {
    for (const entry of fs.readdirSync(pnpmDirectory, { withFileTypes: true })) {
      if (entry.isDirectory()) collectFromNodeModules(path.join(pnpmDirectory, entry.name, "node_modules"));
    }
  }

  for (const [packageName, source] of packageSources) {
    const destination = path.join(destinationNodeModules, ...packageName.split("/"));
    if (path.resolve(source) === path.resolve(destination)) continue;
    if (!fs.existsSync(destination)) fs.cpSync(source, destination, { recursive: true, force: true, dereference: true });
  }
}

function assertRequiredModules(standaloneWebDirectory) {
  const requiredModules = ["next", "styled-jsx/package.json", "@prisma/client", ".prisma/client"];
  for (const moduleName of requiredModules) {
    try {
      require.resolve(moduleName, { paths: [standaloneWebDirectory] });
    } catch (error) {
      throw new Error(`The standalone runtime is missing ${moduleName}: ${error.message}`);
    }
  }
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });

  await sharp(path.join(desktopDirectory, "resources", "icon.svg"))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDirectory, "icon.png"));

  fs.cpSync(
    path.join(webDirectory, ".next", "static"),
    path.join(standaloneWebDirectory, ".next", "static"),
    { recursive: true, force: true }
  );

  const standaloneDirectory = path.join(webDirectory, ".next", "standalone");
  materializeJunctions(standaloneDirectory);
  const standaloneNodeModules = path.join(standaloneWebDirectory, "node_modules");
  flattenTracedModules(standaloneDirectory, standaloneNodeModules);

  const pnpmDirectory = path.join(standaloneDirectory, "node_modules", ".pnpm");
  const prismaClientDirectory = fs
    .readdirSync(pnpmDirectory, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.startsWith("@prisma+client@"));
  if (!prismaClientDirectory) throw new Error("The traced Prisma Client runtime was not found.");

  fs.cpSync(
    path.join(pnpmDirectory, prismaClientDirectory.name, "node_modules", ".prisma"),
    path.join(standaloneNodeModules, ".prisma"),
    { recursive: true, force: true, dereference: true }
  );
  assertNoJunctions(standaloneDirectory);
  assertRequiredModules(standaloneWebDirectory);

  const sharedBuildOptions = {
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["@prisma/client"],
    logLevel: "info"
  };

  await Promise.all([
    esbuild.build({
      ...sharedBuildOptions,
      entryPoints: [path.join(workspaceDirectory, "packages", "db", "prisma", "seed.ts")],
      outfile: path.join(outputDirectory, "seed.cjs")
    }),
    esbuild.build({
      ...sharedBuildOptions,
      entryPoints: [path.join(workspaceDirectory, "apps", "worker", "src", "index.ts")],
      outfile: path.join(outputDirectory, "worker.cjs")
    }),
    esbuild.build({
      ...sharedBuildOptions,
      entryPoints: [path.join(workspaceDirectory, "apps", "worker", "src", "cli.ts")],
      outfile: path.join(outputDirectory, "worker-cli.cjs")
    })
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
