ALTER TABLE "InternshipPosting"
ADD COLUMN "newGradFlag" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "InternshipPosting_newGradFlag_isActive_idx"
ON "InternshipPosting"("newGradFlag", "isActive");
