CREATE TABLE "UserPostingListItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internshipPostingId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPostingListItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_posting_list_unique_posting"
ON "UserPostingListItem"("userId", "internshipPostingId");

CREATE INDEX "UserPostingListItem_userId_createdAt_idx"
ON "UserPostingListItem"("userId", "createdAt");

CREATE INDEX "UserPostingListItem_userId_isCompleted_idx"
ON "UserPostingListItem"("userId", "isCompleted");

ALTER TABLE "UserPostingListItem"
ADD CONSTRAINT "UserPostingListItem_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPostingListItem"
ADD CONSTRAINT "UserPostingListItem_internshipPostingId_fkey"
FOREIGN KEY ("internshipPostingId") REFERENCES "InternshipPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
