import { readBaseEnv } from "@faang-quant/config";
import { prisma, AlertCadence, AlertDeliveryStatus, AlertChannel } from "@faang-quant/db";
import {
  getPreferredPostingUrl,
  listingFilterSchema,
  matchesListingFilters,
  type ListingFilters,
  type ListingSearchRecord
} from "@faang-quant/shared";
import {
  EmailAlertProvider,
  renderDailyDigestEmail,
  renderImmediateAlertEmail
} from "@faang-quant/email";
import { subDays } from "date-fns";
import { logger } from "./logger";

function toListingSearchRecord(posting: {
  company: { slug: string; companyBucket: string };
  companyNameSnapshot: string;
  title: string;
  roleCategory: string;
  season: string | null;
  year: number | null;
  locationRaw: string | null;
  locationCountries: string[];
  remoteType: string;
  compensationMin: unknown;
  compensationMax: unknown;
  isActive: boolean;
  postingDate: Date | null;
  discoveredAt: Date;
}): ListingSearchRecord {
  const toNumeric = (value: unknown) => {
    if (typeof value === "number") {
      return value;
    }
    if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
      return value.toNumber();
    }

    return undefined;
  };

  return {
    companySlug: posting.company.slug,
    companyNameSnapshot: posting.companyNameSnapshot,
    companyBucket: posting.company.companyBucket as ListingSearchRecord["companyBucket"],
    title: posting.title,
    roleCategory: posting.roleCategory as ListingSearchRecord["roleCategory"],
    season: posting.season,
    year: posting.year,
    locationRaw: posting.locationRaw,
    locationCountries: posting.locationCountries,
    remoteType: posting.remoteType as ListingSearchRecord["remoteType"],
    compensationMin: toNumeric(posting.compensationMin),
    compensationMax: toNumeric(posting.compensationMax),
    isActive: posting.isActive,
    postingDate: posting.postingDate,
    discoveredAt: posting.discoveredAt
  };
}

function parseSavedSearchFilters(filterJson: unknown): ListingFilters | null {
  const parsed = listingFilterSchema.safeParse(filterJson);

  return parsed.success ? parsed.data : null;
}

export async function sendImmediateAlertsForPostings(postingIds: string[]) {
  if (postingIds.length === 0) {
    return;
  }

  const env = readBaseEnv();
  const emailProvider = new EmailAlertProvider();
  const uniquePostingIds = Array.from(new Set(postingIds));
  const [postings, searches] = await Promise.all([
    prisma.internshipPosting.findMany({
      where: { id: { in: uniquePostingIds } },
      include: {
        company: true
      }
    }),
    prisma.savedSearch.findMany({
      where: {
        alertsEnabled: true,
        alertCadence: AlertCadence.IMMEDIATE,
        user: {
          alertEmailsEnabled: true
        }
      },
      include: {
        user: true
      }
    })
  ]);

  for (const posting of postings) {
    const record = toListingSearchRecord(posting);

    for (const search of searches) {
      const filters = parseSavedSearchFilters(search.filterJson);

      if (!filters || !matchesListingFilters(record, filters)) {
        continue;
      }

      const dedupeKey = `${AlertChannel.EMAIL}:${search.id}:${posting.id}`;
      const existing = await prisma.alertDelivery.findUnique({
        where: { dedupeKey }
      });

      if (existing) {
        continue;
      }

      const email = renderImmediateAlertEmail({
        searchName: search.name,
        postings: [
          {
            company: posting.companyNameSnapshot,
            title: posting.title,
            location: posting.locationRaw,
            applicationUrl: getPreferredPostingUrl(posting) ?? posting.applicationUrl
          }
        ],
        manageUrl: `${env.APP_BASE_URL}/saved-searches`,
        unsubscribeUrl: `${env.APP_BASE_URL}/unsubscribe?token=${search.user.unsubscribeToken}`
      });

      try {
        const result = await emailProvider.send({
          to: search.user.email,
          subject: email.subject,
          html: email.html,
          text: email.text
        });

        await prisma.alertDelivery.create({
          data: {
            userId: search.userId,
            savedSearchId: search.id,
            internshipPostingId: posting.id,
            channel: AlertChannel.EMAIL,
            status: AlertDeliveryStatus.SENT,
            sentAt: new Date(),
            providerMessageId: result.providerMessageId,
            dedupeKey
          }
        });

        await prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastAlertedAt: new Date() }
        });
      } catch (error) {
        logger.error({ error, postingId: posting.id, savedSearchId: search.id }, "Immediate alert failed");

        await prisma.alertDelivery.create({
          data: {
            userId: search.userId,
            savedSearchId: search.id,
            internshipPostingId: posting.id,
            channel: AlertChannel.EMAIL,
            status: AlertDeliveryStatus.FAILED,
            dedupeKey,
            errorText: error instanceof Error ? error.message : "Unknown alert error"
          }
        });
      }
    }
  }
}

export async function sendDailyDigests() {
  const env = readBaseEnv();
  const emailProvider = new EmailAlertProvider();
  const searches = await prisma.savedSearch.findMany({
    where: {
      alertsEnabled: true,
      alertCadence: AlertCadence.DAILY,
      user: {
        alertEmailsEnabled: true
      }
    },
    include: {
      user: true
    }
  });

  for (const search of searches) {
    const filters = parseSavedSearchFilters(search.filterJson);

    if (!filters) {
      continue;
    }

    const since = search.lastAlertedAt ?? subDays(new Date(), 1);
    const postings = await prisma.internshipPosting.findMany({
      where: {
        discoveredAt: { gt: since },
        internshipFlag: true
      },
      orderBy: { discoveredAt: "desc" },
      include: { company: true }
    });

    const matches = postings.filter((posting) => matchesListingFilters(toListingSearchRecord(posting), filters));

    if (matches.length === 0) {
      continue;
    }

    const alreadyDelivered = await prisma.alertDelivery.findMany({
      where: {
        savedSearchId: search.id,
        channel: AlertChannel.EMAIL,
        internshipPostingId: { in: matches.map((posting) => posting.id) }
      },
      select: {
        internshipPostingId: true
      }
    });
    const deliveredIds = new Set(alreadyDelivered.map((delivery) => delivery.internshipPostingId));
    const pendingMatches = matches.filter((posting) => !deliveredIds.has(posting.id));

    if (pendingMatches.length === 0) {
      continue;
    }

    const email = renderDailyDigestEmail({
      postings: pendingMatches.map((posting) => ({
        company: posting.companyNameSnapshot,
        title: posting.title,
        location: posting.locationRaw,
        applicationUrl: getPreferredPostingUrl(posting) ?? posting.applicationUrl
      })),
      manageUrl: `${env.APP_BASE_URL}/saved-searches`,
      unsubscribeUrl: `${env.APP_BASE_URL}/unsubscribe?token=${search.user.unsubscribeToken}`
    });

    try {
      await emailProvider.send({
        to: search.user.email,
        subject: email.subject,
        html: email.html,
        text: email.text
      });

      for (const posting of pendingMatches) {
        await prisma.alertDelivery.create({
          data: {
            userId: search.userId,
            savedSearchId: search.id,
            internshipPostingId: posting.id,
            channel: AlertChannel.EMAIL,
            status: AlertDeliveryStatus.SENT,
            sentAt: new Date(),
            dedupeKey: `${AlertChannel.EMAIL}:${search.id}:${posting.id}`
          }
        });
      }

      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastAlertedAt: new Date() }
      });
    } catch (error) {
      logger.error({ error, savedSearchId: search.id }, "Daily digest failed");
    }
  }
}
