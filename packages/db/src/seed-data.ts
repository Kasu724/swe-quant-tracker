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
  "akuna-capital": {
    websiteUrl: "https://akunacapital.com",
    careersUrl: "https://akunacapital.com/careers"
  },
  adobe: {
    websiteUrl: "https://www.adobe.com",
    careersUrl: "https://careers.adobe.com/us/en/search-results"
  },
  amd: {
    websiteUrl: "https://www.amd.com",
    careersUrl: "https://careers.amd.com/careers-home/jobs"
  },
  airbnb: {
    websiteUrl: "https://www.airbnb.com",
    careersUrl: "https://careers.airbnb.com/positions/"
  },
  amazon: {
    websiteUrl: "https://www.amazon.com",
    careersUrl: "https://www.amazon.jobs"
  },
  atlassian: {
    websiteUrl: "https://www.atlassian.com",
    careersUrl: "https://www.atlassian.com/company/careers/all-jobs"
  },
  block: {
    websiteUrl: "https://block.xyz",
    careersUrl: "https://block.xyz/careers"
  },
  google: {
    websiteUrl: "https://about.google",
    careersUrl: "https://www.google.com/about/careers/applications"
  },
  github: {
    websiteUrl: "https://github.com",
    careersUrl: "https://www.github.careers/careers-home"
  },
  hubspot: {
    websiteUrl: "https://www.hubspot.com",
    careersUrl: "https://www.hubspot.com/careers"
  },
  linkedin: {
    websiteUrl: "https://www.linkedin.com",
    careersUrl: "https://careers.linkedin.com"
  },
  lyft: {
    websiteUrl: "https://www.lyft.com",
    careersUrl: "https://www.lyft.com/careers"
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
  coinbase: {
    websiteUrl: "https://www.coinbase.com",
    careersUrl: "https://www.coinbase.com/careers/positions"
  },
  databricks: {
    websiteUrl: "https://www.databricks.com",
    careersUrl: "https://www.databricks.com/company/careers/open-positions"
  },
  datadog: {
    websiteUrl: "https://www.datadoghq.com",
    careersUrl: "https://careers.datadoghq.com"
  },
  dropbox: {
    websiteUrl: "https://www.dropbox.com",
    careersUrl: "https://jobs.dropbox.com/all-jobs"
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
  imc: {
    websiteUrl: "https://www.imc.com",
    careersUrl: "https://www.imc.com/us/careers/"
  },
  intel: {
    websiteUrl: "https://www.intel.com",
    careersUrl: "https://jobs.intel.com/en"
  },
  mongodb: {
    websiteUrl: "https://www.mongodb.com",
    careersUrl: "https://www.mongodb.com/careers"
  },
  vercel: {
    websiteUrl: "https://vercel.com",
    careersUrl: "https://vercel.com/careers"
  },
  notion: {
    websiteUrl: "https://www.notion.so",
    careersUrl: "https://www.notion.so/careers"
  },
  palantir: {
    websiteUrl: "https://www.palantir.com",
    careersUrl: "https://www.palantir.com/careers/"
  },
  pinterest: {
    websiteUrl: "https://www.pinterest.com",
    careersUrl: "https://www.pinterestcareers.com/"
  },
  qualcomm: {
    websiteUrl: "https://www.qualcomm.com",
    careersUrl: "https://careers.qualcomm.com/careers"
  },
  reddit: {
    websiteUrl: "https://www.redditinc.com",
    careersUrl: "https://redditinc.com/careers"
  },
  robinhood: {
    websiteUrl: "https://www.robinhood.com",
    careersUrl: "https://careers.robinhood.com/"
  },
  salesforce: {
    websiteUrl: "https://www.salesforce.com",
    careersUrl: "https://careers.salesforce.com/en/jobs/"
  },
  snap: {
    websiteUrl: "https://www.snap.com",
    careersUrl: "https://careers.snap.com/jobs"
  },
  optiver: {
    websiteUrl: "https://optiver.com",
    careersUrl: "https://optiver.com/working-at-optiver/early-careers/"
  },
  shopify: {
    websiteUrl: "https://www.shopify.com",
    careersUrl: "https://www.shopify.com/careers"
  },
  snowflake: {
    websiteUrl: "https://www.snowflake.com",
    careersUrl: "https://careers.snowflake.com"
  },
  spotify: {
    websiteUrl: "https://www.spotify.com",
    careersUrl: "https://www.lifeatspotify.com/jobs"
  },
  twilio: {
    websiteUrl: "https://www.twilio.com",
    careersUrl: "https://www.twilio.com/company/jobs"
  },
  waymo: {
    websiteUrl: "https://waymo.com",
    careersUrl: "https://careers.withwaymo.com/"
  },
  workday: {
    websiteUrl: "https://www.workday.com",
    careersUrl: "https://workday.wd5.myworkdayjobs.com/Workday"
  },
  zoom: {
    websiteUrl: "https://www.zoom.com",
    careersUrl: "https://careers.zoom.us/home"
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
    requestConfigJson: { maxPages: 8, rateLimitMs: 1500, validatePostingUrls: true },
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
    companySlug: "google",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official Google careers internships search",
    sourceIdentifier: "google-careers-intern",
    sourceUrl: "https://www.google.com/about/careers/applications/jobs/results?q=intern",
    pollingEnabled: true,
    priority: 6,
    requestConfigJson: { maxPages: 3, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "google-careers-search" },
    isActive: true
  },
  {
    companySlug: "microsoft",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Microsoft careers internships search",
    sourceIdentifier: "microsoft-pcsx",
    sourceUrl:
      "https://apply.careers.microsoft.com/api/pcsx/search?domain=microsoft.com&query=intern&location=&filter_employment_type=Internship",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { pageSize: 10, maxPages: 15, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "microsoft-pcsx-search" },
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
    companySlug: "nvidia",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Nvidia careers via Workday",
    sourceIdentifier: "nvidia-external-careers",
    sourceUrl: "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: {
      pageSize: 20,
      maxPages: 3,
      appliedFacets: {
        workerSubType: ["0c40f6bd1d8f10adf6dae42e46d44a17"]
      },
      rateLimitMs: 1500
    },
    isActive: true
  },
  {
    companySlug: "adobe",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Adobe careers via Workday",
    sourceIdentifier: "adobe-external-experienced",
    sourceUrl: "https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: {
      pageSize: 20,
      maxPages: 6,
      searchText: "intern",
      rateLimitMs: 1500
    },
    isActive: true
  },
  {
    companySlug: "amd",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official AMD careers API",
    sourceIdentifier: "amd-jibe",
    sourceUrl: "https://careers.amd.com/api/jobs",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      maxPages: 4,
      query: "intern",
      queryParamName: "keywords",
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "jibe-jobs" },
    isActive: true
  },
  {
    companySlug: "atlassian",
    sourceType: SourceType.LEVER,
    sourceName: "Official careers site via Lever",
    sourceIdentifier: "atlassian",
    sourceUrl: "https://api.lever.co/v0/postings/atlassian?mode=json",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { limit: 100, rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "block",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "block",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/block/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
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
    companySlug: "airbnb",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "airbnb",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "akuna-capital",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "akunacapital",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/akunacapital/jobs?content=true",
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
    companySlug: "coinbase",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "coinbase",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/coinbase/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "databricks",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "databricks",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/databricks/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "datadog",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "datadog",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/datadog/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "dropbox",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "dropbox",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/dropbox/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "figma",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "figma",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "github",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official GitHub careers API",
    sourceIdentifier: "github-jibe",
    sourceUrl: "https://www.github.careers/api/jobs",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { maxPages: 10, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "github-jibe-jobs" },
    isActive: true
  },
  {
    companySlug: "hubspot",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "hubspot",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/hubspot/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "imc",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "imc",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/imc/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "intel",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Intel careers via Workday",
    sourceIdentifier: "intel-external",
    sourceUrl: "https://intel.wd1.myworkdayjobs.com/wday/cxs/intel/External/jobs",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: {
      pageSize: 20,
      maxPages: 5,
      searchText: "intern",
      rateLimitMs: 1500
    },
    isActive: true
  },
  {
    companySlug: "linkedin",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "linkedin",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/linkedin/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "lyft",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "lyft",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/lyft/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "mongodb",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "mongodb",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/mongodb/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "notion",
    sourceType: SourceType.ASHBY,
    sourceName: "Official careers site via Ashby",
    sourceIdentifier: "notion",
    sourceUrl: "https://jobs.ashbyhq.com/notion",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "palantir",
    sourceType: SourceType.LEVER,
    sourceName: "Official careers site via Lever",
    sourceIdentifier: "palantir",
    sourceUrl: "https://api.lever.co/v0/postings/palantir?mode=json",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { limit: 100, rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "pinterest",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "pinterest",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/pinterest/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "qualcomm",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Qualcomm careers search",
    sourceIdentifier: "qualcomm-pcsx",
    sourceUrl:
      "https://careers.qualcomm.com/api/pcsx/search?domain=qualcomm.com&query=intern&location=",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { pageSize: 10, maxPages: 20, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "pcsx-search" },
    isActive: true
  },
  {
    companySlug: "reddit",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "reddit",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/reddit/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "salesforce",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Salesforce jobs RSS",
    sourceIdentifier: "salesforce-rss",
    sourceUrl: "https://careers.salesforce.com/en/jobs/xml/?rss=true",
    pollingEnabled: true,
    priority: 6,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "salesforce-rss" },
    isActive: true
  },
  {
    companySlug: "snap",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Snap careers via Workday",
    sourceIdentifier: "snap-workday",
    sourceUrl: "https://wd1.myworkdaysite.com/wday/cxs/snapchat/snap/jobs",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: {
      pageSize: 20,
      maxPages: 6,
      searchText: "intern",
      rateLimitMs: 1500
    },
    isActive: true
  },
  {
    companySlug: "optiver",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "optiverus",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/optiverus/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "vercel",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "vercel",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/vercel/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "robinhood",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "robinhood",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/robinhood/jobs?content=true",
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
    companySlug: "snowflake",
    sourceType: SourceType.ASHBY,
    sourceName: "Official careers site via Ashby",
    sourceIdentifier: "snowflake",
    sourceUrl: "https://jobs.ashbyhq.com/snowflake",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "spotify",
    sourceType: SourceType.LEVER,
    sourceName: "Official careers site via Lever",
    sourceIdentifier: "spotify",
    sourceUrl: "https://api.lever.co/v0/postings/spotify?mode=json",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { limit: 100, rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "twilio",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "twilio",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/twilio/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "waymo",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "waymo",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/waymo/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "workday",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Workday careers via Workday",
    sourceIdentifier: "workday-company-careers",
    sourceUrl: "https://workday.wd5.myworkdayjobs.com/wday/cxs/workday/Workday/jobs",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: {
      pageSize: 20,
      maxPages: 8,
      searchText: "intern",
      rateLimitMs: 1500
    },
    isActive: true
  },
  {
    companySlug: "zoom",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Zoom careers via Workday",
    sourceIdentifier: "zoom-workday",
    sourceUrl: "https://zoom.wd5.myworkdayjobs.com/wday/cxs/zoom/Zoom/jobs",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: {
      pageSize: 20,
      maxPages: 8,
      searchText: "intern",
      rateLimitMs: 1500
    },
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
