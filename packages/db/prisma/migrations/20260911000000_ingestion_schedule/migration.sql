CREATE TABLE "IngestionSchedule" (
    "id" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionSchedule_pkey" PRIMARY KEY ("id")
);

INSERT INTO "IngestionSchedule" ("id", "intervalMinutes", "nextRunAt", "updatedAt")
VALUES ('default', 30, CURRENT_TIMESTAMP + INTERVAL '30 minutes', CURRENT_TIMESTAMP);
