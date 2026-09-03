import { prisma, type Prisma } from "@swe-quant/db";
import {
  extractLocationCountries,
  isInternshipPosting,
  isUsOrUnknownPostingLocation,
  normalizeLocations,
  stripHtml,
  type NormalizedLocation
} from "@swe-quant/shared";
import { logger } from "../lib/logger";

function toMetadataRecord(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function toNormalizedLocations(value: Prisma.JsonValue | null): NormalizedLocation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is NormalizedLocation => {
    return (
      Boolean(entry) &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      typeof (entry as NormalizedLocation).raw === "string" &&
      typeof (entry as NormalizedLocation).key === "string"
    );
  });
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
      locationRaw: true,
      locationsNormalized: true,
      locationCountries: true,
      metadataJson: true,
      isActive: true
    }
  });

  const idsToDeactivate = postings
    .filter((posting) => {
      const description =
        posting.descriptionText ??
        (posting.descriptionRaw ? stripHtml(posting.descriptionRaw) : undefined);
      const metadata = toMetadataRecord(posting.metadataJson);
      const locations = toNormalizedLocations(posting.locationsNormalized);
      const locationCountries = [
        ...posting.locationCountries,
        ...extractLocationCountries(
          locations.length > 0 ? locations : normalizeLocations([posting.locationRaw]),
          metadata
        )
      ];

      return (
        !isInternshipPosting(posting.title, description, {
          employmentType: posting.employmentType,
          metadata
        }) || !isUsOrUnknownPostingLocation(locationCountries)
      );
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
