import { prisma } from "./client";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [database] = await prisma.$queryRaw<Array<{ database: string }>>`
    SELECT current_database() AS database
  `;
  const [companies, postings, users, listedPostings] = await Promise.all([
    prisma.company.count(),
    prisma.internshipPosting.count(),
    prisma.user.count(),
    prisma.userPostingListItem.count()
  ]);

  let host = "unknown";

  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    // A successful query is the authoritative connection check.
  }

  console.log(`Connected to ${database?.database ?? "unknown"} at ${host}.`);
  console.log(
    `Rows: ${companies} companies, ${postings} postings, ${users} users, ${listedPostings} list items.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
