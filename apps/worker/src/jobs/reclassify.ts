import { prisma, type Prisma } from "@faang-quant/db";
import { isInternshipPosting, stripHtml } from "@faang-quant/shared";
import { logger } from "../lib/logger";

function toMetadataRecord(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

export async function runInternshipReclassification() {
  const postings = await prisma.internshipPosting.findMany({
    where: {
      internshipFlag: true
    },
    select: {
      id: true,
      title: true,
      descriptionText: true,
      descriptionRaw: true,
      employmentType: true,
      metadataJson: true,
      isActive: true
    }
  });

  const idsToDeactivate = postings
    .filter((posting) => {
      const description =
        posting.descriptionText ??
        (posting.descriptionRaw ? stripHtml(posting.descriptionRaw) : undefined);

      return !isInternshipPosting(posting.title, description, {
        employmentType: posting.employmentType,
        metadata: toMetadataRecord(posting.metadataJson)
      });
    })
    .map((posting) => posting.id);

  if (idsToDeactivate.length > 0) {
    await prisma.internshipPosting.updateMany({
      where: {
        id: {
          in: idsToDeactivate
        }
      },
      data: {
        internshipFlag: false,
        isActive: false
      }
    });
  }

  logger.info(
    {
      inspected: postings.length,
      deactivated: idsToDeactivate.length
    },
    "Internship reclassification completed"
  );
}
