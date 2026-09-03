import { runDailyDigestCycle } from "./jobs/digest";
import { runIngestionCycle } from "./jobs/ingest";
import { runPostingLinkCheck } from "./jobs/link-check";
import { runInternshipReclassification } from "./jobs/reclassify";
import { runDiscordNotifications } from "./jobs/discord";
import { prisma } from "@swe-quant/db";

async function main() {
  const command = process.argv[2];

  if (command === "ingest") {
    const reportProgress = process.env.INGESTION_PROGRESS === "ipc"
      ? (progress: unknown) => {
          const encoded = Buffer.from(JSON.stringify(progress), "utf8").toString("base64");
          process.stdout.write(`INGESTION_PROGRESS\t${encoded}\n`);
        }
      : undefined;
    await runIngestionCycle({ onProgress: reportProgress });
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
