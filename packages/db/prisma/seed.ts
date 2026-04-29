import { hash } from "bcryptjs";
import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { readSeedEnv } from "@faang-quant/config";
import { companySeeds, companySourceSeeds } from "../src/seed-data";

const prisma = new PrismaClient();

function toPrismaJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value as Prisma.InputJsonValue | undefined;
}

async function seedCompanies() {
  const companyIdBySlug = new Map<string, string>();
  const trackedCompanySlugs = Array.from(new Set(companySourceSeeds.map((source) => source.companySlug)));

  for (const company of companySeeds) {
    const record = await prisma.company.upsert({
      where: { slug: company.slug },
      update: {
        name: company.name,
        websiteUrl: company.websiteUrl,
        careersUrl: company.careersUrl,
        companyBucket: company.companyBucket,
        tags: company.tags,
        notes: company.notes,
        isActive: true
      },
      create: {
        name: company.name,
        slug: company.slug,
        websiteUrl: company.websiteUrl,
        careersUrl: company.careersUrl,
        companyBucket: company.companyBucket,
        tags: company.tags,
        notes: company.notes,
        isActive: true
      }
    });

    companyIdBySlug.set(company.slug, record.id);
  }

  for (const source of companySourceSeeds) {
    const companyId = companyIdBySlug.get(source.companySlug);

    if (!companyId) {
      throw new Error(`Missing company seed for source: ${source.companySlug}`);
    }

    await prisma.companySource.upsert({
      where: {
        companyId_sourceType_sourceIdentifier: {
          companyId,
          sourceType: source.sourceType,
          sourceIdentifier: source.sourceIdentifier
        }
      },
      update: {
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        pollingEnabled: source.pollingEnabled,
        priority: source.priority,
        requestConfigJson: toPrismaJson(source.requestConfigJson),
        parserConfigJson: toPrismaJson(source.parserConfigJson),
        isActive: source.isActive
      },
      create: {
        companyId,
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        sourceIdentifier: source.sourceIdentifier,
        sourceUrl: source.sourceUrl,
        pollingEnabled: source.pollingEnabled,
        priority: source.priority,
        requestConfigJson: toPrismaJson(source.requestConfigJson),
        parserConfigJson: toPrismaJson(source.parserConfigJson),
        isActive: source.isActive
      }
    });
  }

  const trackedSourceKeys = new Set(
    companySourceSeeds.map(
      (source) => `${source.companySlug}:${source.sourceType}:${source.sourceIdentifier}`
    )
  );
  const existingSources = await prisma.companySource.findMany({
    include: {
      company: {
        select: {
          slug: true
        }
      }
    }
  });
  const sourceIdsToDisable = existingSources
    .filter((source) => {
      const sourceKey = `${source.company.slug}:${source.sourceType}:${source.sourceIdentifier}`;
      return !trackedSourceKeys.has(sourceKey);
    })
    .map((source) => source.id);

  if (sourceIdsToDisable.length > 0) {
    await prisma.companySource.updateMany({
      where: {
        id: {
          in: sourceIdsToDisable
        }
      },
      data: {
        pollingEnabled: false,
        isActive: false
      }
    });
  }

  await prisma.internshipPosting.updateMany({
    where: {
      company: {
        slug: {
          notIn: trackedCompanySlugs
        }
      }
    },
    data: {
      isActive: false
    }
  });
}

async function seedAdminUser() {
  const env = readSeedEnv();

  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    return;
  }

  const passwordHash = await hash(env.SEED_ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: new Date()
    },
    create: {
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      name: "Admin",
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: new Date()
    }
  });
}

async function main() {
  await seedCompanies();
  await seedAdminUser();

  console.info(
    `Seeded ${companySeeds.length} companies and ${companySourceSeeds.length} tracked pilot company sources.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
