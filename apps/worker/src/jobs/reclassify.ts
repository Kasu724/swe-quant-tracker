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

export function classifyStoredPosting(input: {
  title: string;
  descriptionText?: string | null;
  descriptionRaw?: string | null;
  employmentType?: string | null;
  locationRaw?: string | null;
  locationsNormalized?: Prisma.JsonValue | null;
  metadataJson?: Prisma.JsonValue | null;
}) {
  const description =
    input.descriptionText ?? (input.descriptionRaw ? stripHtml(input.descriptionRaw) : undefined);
  const metadata = toMetadataRecord(input.metadataJson ?? null);
  const existingLocations = toNormalizedLocations(input.locationsNormalized ?? null);
  const locations = normalizeLocations([
    input.locationRaw,
    ...existingLocations.map((location) => location.raw)
  ]);
  const locationCountries = extractLocationCountries(locations, metadata);
  const internshipFlag = isInternshipPosting(input.title, description, {
    employmentType: input.employmentType,
    metadata
  });
  const newGradFlag =
    !internshipFlag &&
    isNewGradPosting(input.title, description, {
      employmentType: input.employmentType,
      metadata
    });

  return { internshipFlag, newGradFlag, locations, locationCountries };
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

  const updates = postings.map((posting) => ({
    id: posting.id,
    ...classifyStoredPosting(posting)
  }));

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

export async function runLocationNormalization() {
  const postings = await prisma.internshipPosting.findMany({
    select: {
      id: true,
      locationRaw: true,
      locationsNormalized: true,
      locationCountries: true,
      metadataJson: true
    }
  });

  for (const posting of postings) {
    const existingLocations = toNormalizedLocations(posting.locationsNormalized ?? null);
    const locations = normalizeLocations([
      posting.locationRaw,
      ...existingLocations.map((location) => location.raw)
    ]);
    const locationCountries = extractLocationCountries(
      locations,
      toMetadataRecord(posting.metadataJson ?? null)
    );

    await prisma.internshipPosting.update({
      where: { id: posting.id },
      data: {
        locationsNormalized: locations as Prisma.InputJsonValue,
        locationCountries
      }
    });
  }

  logger.info(
    {
      inspected: postings.length,
      changed: postings.filter((posting) => {
        const existing = toNormalizedLocations(posting.locationsNormalized ?? null);
        return JSON.stringify(existing) !== JSON.stringify(normalizeLocations([
          posting.locationRaw,
          ...existing.map((location) => location.raw)
        ]));
      }).length
    },
    "Location normalization completed"
  );
}
