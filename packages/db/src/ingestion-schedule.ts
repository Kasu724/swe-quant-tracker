import { prisma } from "./client";

export const INGESTION_SCHEDULE_ID = "default";
export const DEFAULT_INGESTION_INTERVAL_MINUTES = 30;
export const INGESTION_INTERVAL_OPTIONS = [15, 30, 60, 120, 360, 720, 1_440] as const;

export type IngestionIntervalMinutes = (typeof INGESTION_INTERVAL_OPTIONS)[number];

export function isIngestionIntervalMinutes(value: number): value is IngestionIntervalMinutes {
  return INGESTION_INTERVAL_OPTIONS.includes(value as IngestionIntervalMinutes);
}

export function getNextIngestionRunAt(now: Date, intervalMinutes: number) {
  return new Date(now.getTime() + intervalMinutes * 60_000);
}

function isUniqueConstraintError(error: unknown) {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function ensureIngestionSchedule() {
  const now = new Date();

  try {
    return await prisma.ingestionSchedule.upsert({
      where: { id: INGESTION_SCHEDULE_ID },
      update: {},
      create: {
        id: INGESTION_SCHEDULE_ID,
        intervalMinutes: DEFAULT_INGESTION_INTERVAL_MINUTES,
        nextRunAt: getNextIngestionRunAt(now, DEFAULT_INGESTION_INTERVAL_MINUTES)
      }
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return prisma.ingestionSchedule.findUniqueOrThrow({
      where: { id: INGESTION_SCHEDULE_ID }
    });
  }
}

export async function updateIngestionSchedule(intervalMinutes: IngestionIntervalMinutes) {
  const now = new Date();

  return prisma.ingestionSchedule.upsert({
    where: { id: INGESTION_SCHEDULE_ID },
    update: {
      intervalMinutes,
      nextRunAt: getNextIngestionRunAt(now, intervalMinutes)
    },
    create: {
      id: INGESTION_SCHEDULE_ID,
      intervalMinutes,
      nextRunAt: getNextIngestionRunAt(now, intervalMinutes)
    }
  });
}

/**
 * Claim one due scheduled cycle. The conditional update makes the scheduler
 * safe if more than one worker instance is connected to the same database.
 */
export async function claimDueIngestionSchedule(now = new Date()) {
  const schedule = await ensureIngestionSchedule();
  const nextRunAt = getNextIngestionRunAt(now, schedule.intervalMinutes);
  const claimed = await prisma.ingestionSchedule.updateMany({
    where: {
      id: INGESTION_SCHEDULE_ID,
      nextRunAt: { lte: now }
    },
    data: { nextRunAt }
  });

  return claimed.count === 1 ? schedule : null;
}
