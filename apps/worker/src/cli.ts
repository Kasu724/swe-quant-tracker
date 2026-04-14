import { runDailyDigestCycle } from "./jobs/digest";
import { runIngestionCycle } from "./jobs/ingest";

async function main() {
  const command = process.argv[2];

  if (command === "ingest") {
    await runIngestionCycle();
    return;
  }

  if (command === "digest") {
    await runDailyDigestCycle();
    return;
  }

  throw new Error(`Unknown worker command: ${command ?? "<missing>"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

