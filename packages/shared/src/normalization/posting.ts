import type {
  AdapterCompany,
  AdapterFetchedPosting,
  AdapterSource,
  NormalizedPostingRecord
} from "../types";
import { categorizeRole, normalizeTitle } from "./role";
import { computeDedupeFingerprint } from "./dedupe";
import { parseCompensation } from "./compensation";
import { isInternshipPosting } from "./internship";
import { detectRemoteType, extractLocationCountries, normalizeLocations } from "./location";
import { inferSeasonYear } from "./season";
import { slugify, stripHtml } from "./text";

function toDate(value?: string | Date | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}

function buildPostingSlug(companySlug: string, title: string, externalJobId: string): string {
  const titleSlug = slugify(title).slice(0, 72);
  const jobSuffix = externalJobId.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(-12);

  return `${companySlug}-${titleSlug}-${jobSuffix}`;
}

export function normalizeFetchedPosting(input: {
  company: AdapterCompany;
  source: AdapterSource;
  posting: AdapterFetchedPosting;
}): NormalizedPostingRecord {
  const postingDate = toDate(input.posting.postingDate);
  const descriptionText =
    input.posting.descriptionText?.trim() ||
    (input.posting.descriptionHtml ? stripHtml(input.posting.descriptionHtml) : undefined);
  const normalizedTitle = normalizeTitle(input.posting.title);
  const { season, year } = inferSeasonYear(input.posting.title, postingDate, descriptionText);
  const locationsNormalized = normalizeLocations([
    input.posting.locationRaw,
    ...(input.posting.additionalLocations ?? [])
  ]);
  const parsedCompensation = input.posting.compensation ?? parseCompensation(input.posting.payRaw);
  const remoteType = detectRemoteType(
    input.posting.remoteTypeHint,
    input.posting.locationRaw,
    input.posting.employmentType
  );
  const dedupeFingerprint = computeDedupeFingerprint({
    companyName: input.company.name,
    title: input.posting.title,
    locationKeys: locationsNormalized.map((location) => location.key),
    season,
    year
  });

  return {
    slug: buildPostingSlug(input.company.slug, input.posting.title, input.posting.externalJobId),
    externalJobId: input.posting.externalJobId,
    title: input.posting.title,
    normalizedTitle,
    roleCategory: categorizeRole(input.posting.title, descriptionText),
    internshipFlag: isInternshipPosting(input.posting.title, descriptionText, {
      employmentType: input.posting.employmentType,
      metadata: input.posting.metadata ?? undefined
    }),
    season,
    year,
    employmentType: input.posting.employmentType ?? undefined,
    locationRaw: input.posting.locationRaw ?? undefined,
    locationsNormalized,
    locationCountries: extractLocationCountries(locationsNormalized, input.posting.metadata),
    remoteType,
    compensationMin: parsedCompensation.min,
    compensationMax: parsedCompensation.max,
    compensationCurrency: parsedCompensation.currency,
    compensationInterval: parsedCompensation.interval,
    payRaw: input.posting.payRaw ?? parsedCompensation.raw,
    postingDate,
    applicationUrl: input.posting.applicationUrl,
    sourceUrl: input.posting.sourceUrl ?? undefined,
    sourceType: input.source.sourceType,
    sourceName: input.source.sourceName,
    dedupeFingerprint,
    descriptionRaw: input.posting.descriptionHtml ?? undefined,
    descriptionText,
    requirementsText: undefined,
    metadataJson: input.posting.metadata,
    rawPostingJson: input.posting.raw
  };
}
