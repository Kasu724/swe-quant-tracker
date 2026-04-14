import { CompanyBucket, SourceType } from "@prisma/client";

export type SeedCompany = {
  name: string;
  slug: string;
  companyBucket: CompanyBucket;
  tags: string[];
  websiteUrl?: string;
  careersUrl?: string;
  notes?: string;
};

export type SeedCompanySource = {
  companySlug: string;
  sourceType: SourceType;
  sourceName: string;
  sourceIdentifier: string;
  sourceUrl: string;
  pollingEnabled: boolean;
  priority: number;
  requestConfigJson?: Record<string, unknown>;
  parserConfigJson?: Record<string, unknown>;
  isActive: boolean;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function company(
  name: string,
  companyBucket: CompanyBucket,
  tags: string[],
  overrides: Partial<Omit<SeedCompany, "name" | "slug" | "companyBucket" | "tags">> = {}
): SeedCompany {
  return {
    name,
    slug: slugify(name),
    companyBucket,
    tags,
    ...overrides
  };
}

const faangCompanies = [
  "Apple",
  "Amazon",
  "Google",
  "Meta",
  "Microsoft",
  "Netflix",
  "Nvidia",
  "Tesla"
].map((name) =>
  company(name, CompanyBucket.FAANG, ["faang", "mega-cap", "platform"], {
    notes: "Seeded as a core mega-cap / platform target."
  })
);

const bigTechCompanies = [
  "Adobe",
  "Airbnb",
  "AMD",
  "Asana",
  "Atlassian",
  "Block",
  "Bloomberg",
  "Cloudflare",
  "Coinbase",
  "Databricks",
  "Datadog",
  "DoorDash",
  "Dropbox",
  "Figma",
  "GitHub",
  "HubSpot",
  "Intel",
  "LinkedIn",
  "Lyft",
  "MongoDB",
  "Notion",
  "Oracle",
  "Palantir",
  "Pinterest",
  "Qualcomm",
  "Reddit",
  "Robinhood",
  "Salesforce",
  "ServiceNow",
  "Shopify",
  "Slack",
  "Snap",
  "Snowflake",
  "Splunk",
  "Spotify",
  "Square",
  "Stripe",
  "TikTok",
  "Twilio",
  "Uber",
  "Unity",
  "Vercel",
  "VMware",
  "Waymo",
  "Workday",
  "Yahoo",
  "Yelp",
  "Zoom"
].map((name) =>
  company(name, CompanyBucket.BIG_TECH, ["big-tech", "software", "infrastructure"], {
    notes: "Seeded as a major technology / infrastructure employer."
  })
);

const tradingCompanies = [
  "Akuna Capital",
  "Belvedere Trading",
  "CTC",
  "DRW",
  "Five Rings",
  "Flow Traders",
  "Geneva Trading",
  "Hudson River Trading",
  "IMC",
  "Jane Street",
  "Jump Trading",
  "Maven Securities",
  "Old Mission",
  "Optiver",
  "SIG",
  "Susquehanna",
  "Tower Research Capital",
  "Virtu Financial",
  "Wolverine Trading",
  "XR Trading"
].map((name) =>
  company(name, CompanyBucket.TRADING, ["quant", "trading", "market-making"], {
    notes: "Seeded as a trading / market-making target."
  })
);

const hedgeFundCompanies = [
  "Citadel",
  "DE Shaw",
  "G-Research",
  "Millennium",
  "PDT Partners",
  "Qube Research & Technologies",
  "Two Sigma"
].map((name) =>
  company(name, CompanyBucket.HEDGE_FUND, ["quant", "hedge-fund", "research"], {
    notes: "Seeded as a hedge fund / systematic research target."
  })
);

const quantCompanies = [
  "Citadel Securities",
  "Five Rings",
  "Hudson River Trading",
  "IMC",
  "Jane Street",
  "Jump Trading"
].map((name) =>
  company(name, CompanyBucket.QUANT, ["quant", "research", "trading"], {
    notes: "Seeded as a quant-heavy firm with substantial technical recruiting."
  })
);

const companyMap = new Map<string, SeedCompany>();

for (const seed of [
  ...faangCompanies,
  ...bigTechCompanies,
  ...tradingCompanies,
  ...hedgeFundCompanies,
  ...quantCompanies
]) {
  if (!companyMap.has(seed.slug)) {
    companyMap.set(seed.slug, seed);
    continue;
  }

  const existing = companyMap.get(seed.slug)!;

  companyMap.set(seed.slug, {
    ...existing,
    companyBucket: existing.companyBucket,
    tags: Array.from(new Set([...existing.tags, ...seed.tags]))
  });
}

const urlOverrides: Record<string, Pick<SeedCompany, "websiteUrl" | "careersUrl">> = {
  apple: {
    websiteUrl: "https://www.apple.com",
    careersUrl: "https://jobs.apple.com"
  },
  amazon: {
    websiteUrl: "https://www.amazon.com",
    careersUrl: "https://www.amazon.jobs"
  },
  google: {
    websiteUrl: "https://about.google",
    careersUrl: "https://www.google.com/about/careers/applications"
  },
  meta: {
    websiteUrl: "https://about.meta.com",
    careersUrl: "https://www.metacareers.com"
  },
  microsoft: {
    websiteUrl: "https://www.microsoft.com",
    careersUrl: "https://jobs.careers.microsoft.com"
  },
  netflix: {
    websiteUrl: "https://www.netflix.com",
    careersUrl: "https://jobs.netflix.com"
  },
  nvidia: {
    websiteUrl: "https://www.nvidia.com",
    careersUrl: "https://www.nvidia.com/en-us/about-nvidia/careers"
  },
  tesla: {
    websiteUrl: "https://www.tesla.com",
    careersUrl: "https://www.tesla.com/careers"
  },
  stripe: {
    websiteUrl: "https://stripe.com",
    careersUrl: "https://stripe.com/jobs"
  },
  asana: {
    websiteUrl: "https://asana.com",
    careersUrl: "https://asana.com/jobs"
  },
  cloudflare: {
    websiteUrl: "https://www.cloudflare.com",
    careersUrl: "https://www.cloudflare.com/careers/jobs/"
  },
  datadog: {
    websiteUrl: "https://www.datadoghq.com",
    careersUrl: "https://careers.datadoghq.com"
  },
  "five-rings": {
    websiteUrl: "https://fiverings.com",
    careersUrl: "https://fiverings.com/careers/"
  },
  figma: {
    websiteUrl: "https://www.figma.com",
    careersUrl: "https://www.figma.com/careers"
  },
  "hudson-river-trading": {
    websiteUrl: "https://www.hudsonrivertrading.com",
    careersUrl: "https://www.hudsonrivertrading.com/careers/"
  },
  vercel: {
    websiteUrl: "https://vercel.com",
    careersUrl: "https://vercel.com/careers"
  },
  notion: {
    websiteUrl: "https://www.notion.so",
    careersUrl: "https://www.notion.so/careers"
  },
  shopify: {
    websiteUrl: "https://www.shopify.com",
    careersUrl: "https://www.shopify.com/careers"
  },
  snowflake: {
    websiteUrl: "https://www.snowflake.com",
    careersUrl: "https://careers.snowflake.com"
  }
};

export const companySeeds: SeedCompany[] = Array.from(companyMap.values())
  .map((seed) => ({ ...seed, ...urlOverrides[seed.slug] }))
  .sort((left, right) => left.name.localeCompare(right.name));

export const companySourceSeeds: SeedCompanySource[] = [
  {
    companySlug: "apple",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official Apple internships search",
    sourceIdentifier: "apple-internships",
    sourceUrl: "https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN",
    pollingEnabled: true,
    priority: 5,
    requestConfigJson: { maxPages: 8, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "apple-search" },
    isActive: true
  },
  {
    companySlug: "amazon",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Amazon internships search",
    sourceIdentifier: "amazon-search",
    sourceUrl:
      "https://www.amazon.jobs/en/search.json?base_query=&loc_query=&sort=recent&is_intern[]=1",
    pollingEnabled: true,
    priority: 6,
    requestConfigJson: { pageSize: 100, maxPages: 6, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "amazon-search-json" },
    isActive: true
  },
  {
    companySlug: "stripe",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "stripe",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "netflix",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official Netflix internship search",
    sourceIdentifier: "netflix-intern-search",
    sourceUrl: "https://explore.jobs.netflix.net/careers/search?query=intern",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "netflix-smartapply-search" },
    isActive: true
  },
  {
    companySlug: "cloudflare",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "cloudflare",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "asana",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "asana",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/asana/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "hudson-river-trading",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "wehrtyou",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/wehrtyou/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "five-rings",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "fiveringsllc",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/fiveringsllc/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  }
];
