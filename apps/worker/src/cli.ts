import { runDailyDigestCycle } from "./jobs/digest";
import { runIngestionCycle } from "./jobs/ingest";
import { runPostingLinkCheck } from "./jobs/link-check";

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

  if (command === "links") {
    await runPostingLinkCheck();
    return;
  }

  throw new Error(`Unknown worker command: ${command ?? "<missing>"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
