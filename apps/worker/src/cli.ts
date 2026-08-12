import { runDailyDigestCycle } from "./jobs/digest";
import { runIngestionCycle } from "./jobs/ingest";
import { runPostingLinkCheck } from "./jobs/link-check";
import { runInternshipReclassification } from "./jobs/reclassify";
import { runDiscordNotifications } from "./jobs/discord";
import { prisma } from "@faang-quant/db";

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

  if (command === "reclassify") {
    await runInternshipReclassification();
    return;
  }

  if (command === "discord") {
    await runDiscordNotifications();
    return;
  }

  throw new Error(`Unknown worker command: ${command ?? "<missing>"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
