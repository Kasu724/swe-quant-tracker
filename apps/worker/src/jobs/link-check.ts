import { prisma } from "@faang-quant/db";
import { logger } from "../lib/logger";
import { runWithConcurrency } from "../lib/concurrency";
import { resolvePostingUrl } from "../lib/link-health";

export async function runPostingLinkCheck(options?: { limit?: number }) {
  const postings = await prisma.internshipPosting.findMany({
    where: {
      isActive: true,
      internshipFlag: true
    },
    orderBy: [{ updatedAt: "asc" }],
    ...(options?.limit ? { take: options.limit } : {}),
    select: {
      id: true,
      slug: true,
      title: true,
      companyNameSnapshot: true,
      applicationUrl: true,
      sourceUrl: true
    }
  });

  const stats = {
    checked: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
    inconclusive: 0
  };

  await runWithConcurrency(postings, 8, async (posting) => {
    stats.checked += 1;
    const resolution = await resolvePostingUrl(posting);
    const chosenUrl = resolution.url;

    if (!chosenUrl) {
      if (!resolution.conclusiveDead) {
        stats.inconclusive += 1;
        logger.warn(
          {
            postingId: posting.id,
            slug: posting.slug,
            company: posting.companyNameSnapshot,
            title: posting.title
          },
          "Kept posting active because its link check failed inconclusively"
        );
        return;
      }

      await prisma.internshipPosting.update({
        where: { id: posting.id },
        data: {
          isActive: false
        }
      });

      stats.deactivated += 1;
      logger.warn(
        {
          postingId: posting.id,
          slug: posting.slug,
          company: posting.companyNameSnapshot,
          title: posting.title
        },
        "Deactivated posting after link check found no live outbound URL"
      );
      return;
    }

    if (posting.applicationUrl !== chosenUrl) {
      await prisma.internshipPosting.update({
        where: { id: posting.id },
        data: {
          applicationUrl: chosenUrl
        }
      });

      stats.updated += 1;
      logger.info(
        {
          postingId: posting.id,
          slug: posting.slug,
          company: posting.companyNameSnapshot,
          title: posting.title
        },
        "Updated posting outbound URL after link check"
      );
      return;
    }

    stats.unchanged += 1;
  });

  logger.info(stats, "Posting link check completed");

  return stats;
}
