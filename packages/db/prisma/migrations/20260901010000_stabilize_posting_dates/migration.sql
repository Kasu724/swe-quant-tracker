-- A posting cannot have been published after the tracker had already seen it.
-- Several ATS APIs expose a mutable update timestamp in place of a true
-- publication date, and repeat ingestion previously overwrote postingDate
-- with that value. Clamp affected historical rows to the earliest trustworthy
-- upper bound: when this tracker first discovered the posting.
UPDATE "InternshipPosting"
SET
    "postingDate" = "discoveredAt",
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "postingDate" > "discoveredAt";
