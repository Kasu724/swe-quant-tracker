import { prisma, type Prisma } from "@swe-quant/db";
import {
  extractLocationCountries,
  isInternshipPosting,
  isNewGradPosting,
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
      isActive: true,
      newGradFlag: true
    }
  });

  const updates = postings.map((posting) => {
      const description =
        posting.descriptionText ??
        (posting.descriptionRaw ? stripHtml(posting.descriptionRaw) : undefined);
      const metadata = toMetadataRecord(posting.metadataJson);
      const existingLocations = toNormalizedLocations(posting.locationsNormalized);
      const locations = normalizeLocations([
        posting.locationRaw,
        ...existingLocations.map((location) => location.raw)
      ]);
      const locationCountries = extractLocationCountries(locations, metadata);

      const internshipFlag = isInternshipPosting(posting.title, description, {
        employmentType: posting.employmentType,
        metadata
      });
      const newGradFlag =
        !internshipFlag &&
        isNewGradPosting(posting.title, description, {
          employmentType: posting.employmentType,
          metadata
        });

      return {
        id: posting.id,
        internshipFlag,
        newGradFlag,
        locations,
        locationCountries
      };
    });

  for (const update of updates) {
    await prisma.internshipPosting.update({
      where: { id: update.id },
      data: {
        internshipFlag: update.internshipFlag,
        newGradFlag: update.newGradFlag,
        locationsNormalized: update.locations as Prisma.InputJsonValue,
        locationCountries: update.locationCountries
      }
    });
  }

  logger.info(
    {
      inspected: postings.length,
      deactivated: 0,
      internships: updates.filter((posting) => posting.internshipFlag).length,
      newGrad: updates.filter((posting) => posting.newGradFlag).length
    },
    "Internship reclassification completed"
  );
}
