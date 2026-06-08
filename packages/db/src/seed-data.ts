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
  "Affirm",
  "Airbnb",
  "AMD",
  "Anduril",
  "Anthropic",
  "Arm",
  "Asana",
  "Astranis",
  "Atlassian",
  "Aurora",
  "Block",
  "Bloomberg",
  "Box",
  "Brex",
  "Broadcom",
  "Chime",
  "Cisco",
  "Cloudflare",
  "Coinbase",
  "Cockroach Labs",
  "CoreWeave",
  "CrowdStrike",
  "Cursor",
  "Databricks",
  "Datadog",
  "Dell Technologies",
  "Discord",
  "DoorDash",
  "Dropbox",
  "Duolingo",
  "Elastic",
  "Figma",
  "Fivetran",
  "GitHub",
  "GitLab",
  "Hewlett Packard Enterprise",
  "HubSpot",
  "IBM",
  "Intel",
  "Instacart",
  "LinkedIn",
  "LaunchDarkly",
  "Lyft",
  "Marvell",
  "Micron",
  "MongoDB",
  "Neuralink",
  "Notion",
  "Nuro",
  "Okta",
  "Oracle",
  "Palo Alto Networks",
  "Palantir",
  "Perplexity",
  "Pinterest",
  "Qualcomm",
  "Ramp",
  "Reddit",
  "Robinhood",
  "Roblox",
  "Rubrik",
  "Salesforce",
  "Samsara",
  "SAP",
  "Scale AI",
  "ServiceNow",
  "Shopify",
  "Slack",
  "Snap",
  "Snowflake",
  "Splunk",
  "Spotify",
  "Square",
  "Stripe",
  "Texas Instruments",
  "TikTok",
  "Toast",
  "Twilio",
  "Uber",
  "Unity",
  "Vercel",
  "Verkada",
  "VMware",
  "Waymo",
  "Workday",
  "Yahoo",
  "Yelp",
  "Zoom",
  "Zscaler"
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
  "GSA Capital",
  "Hudson River Trading",
  "IMC",
  "Jane Street",
  "Jump Trading",
  "Maven Securities",
  "Old Mission",
  "Optiver",
  "Quadrature Capital",
  "SIG",
  "Susquehanna",
  "Tower Research Capital",
  "TransMarket Group",
  "Valkyrie Trading",
  "Vatic Labs",
  "Virtu Financial",
  "Wolverine Trading",
  "XR Trading"
].map((name) =>
  company(name, CompanyBucket.TRADING, ["quant", "trading", "market-making"], {
    notes: "Seeded as a trading / market-making target."
  })
);

const hedgeFundCompanies = [
  "AQR",
  "Aquatic Capital Management",
  "BlueCrest Capital Management",
  "Capital Fund Management",
  "Citadel",
  "DE Shaw",
  "Engineers Gate",
  "ExodusPoint",
  "G-Research",
  "Graham Capital Management",
  "Man Group",
  "Marshall Wace",
  "Millennium",
  "PDT Partners",
  "Point72",
  "Qube Research & Technologies",
  "Schonfeld",
  "Squarepoint Capital",
  "The Voleon Group",
  "Two Sigma",
  "Winton",
  "WorldQuant"
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
  aqr: {
    websiteUrl: "https://www.aqr.com",
    careersUrl: "https://www.aqr.com/About-Us/Careers"
  },
  "aquatic-capital-management": {
    websiteUrl: "https://www.aquatic.com",
    careersUrl: "https://www.aquatic.com/careers"
  },
  anduril: {
    websiteUrl: "https://www.anduril.com",
    careersUrl: "https://www.anduril.com/careers"
  },
  astranis: {
    websiteUrl: "https://www.astranis.com",
    careersUrl: "https://www.astranis.com/careers"
  },
  aurora: {
    websiteUrl: "https://aurora.tech",
    careersUrl: "https://aurora.tech/careers/"
  },
  "bluecrest-capital-management": {
    websiteUrl: "https://www.bluecrestcapital.com",
    careersUrl: "https://www.bluecrestcapital.com/careers/"
  },
  "capital-fund-management": {
    websiteUrl: "https://www.cfm.com",
    careersUrl: "https://www.cfm.com/join-us-cfm-careers/"
  },
  "cockroach-labs": {
    websiteUrl: "https://www.cockroachlabs.com",
    careersUrl: "https://www.cockroachlabs.com/careers"
  },
  coreweave: {
    websiteUrl: "https://www.coreweave.com",
    careersUrl: "https://www.coreweave.com/careers"
  },
  "engineers-gate": {
    websiteUrl: "https://www.engineersgate.com",
    careersUrl: "https://www.engineersgate.com/careers"
  },
  "gsa-capital": {
    websiteUrl: "https://www.gsacapital.com",
    careersUrl: "https://www.gsacapital.com/join-us"
  },
  "graham-capital-management": {
    websiteUrl: "https://www.grahamcapital.com",
    careersUrl: "https://www.grahamcapital.com/careers/"
  },
  launchdarkly: {
    websiteUrl: "https://launchdarkly.com",
    careersUrl: "https://launchdarkly.com/careers/"
  },
  "marshall-wace": {
    websiteUrl: "https://www.mwam.com",
    careersUrl: "https://www.mwam.com/join-us/"
  },
  neuralink: {
    websiteUrl: "https://neuralink.com",
    careersUrl: "https://neuralink.com/careers/"
  },
  nuro: {
    websiteUrl: "https://www.nuro.ai",
    careersUrl: "https://www.nuro.ai/careers"
  },
  "quadrature-capital": {
    websiteUrl: "https://www.quadrature.ai",
    careersUrl: "https://www.quadrature.ai/careers/join-us/"
  },
  rubrik: {
    websiteUrl: "https://www.rubrik.com",
    careersUrl: "https://www.rubrik.com/company/careers"
  },
  "the-voleon-group": {
    websiteUrl: "https://voleon.com",
    careersUrl: "https://voleon.com/jobs/"
  },
  "vatic-labs": {
    websiteUrl: "https://www.vaticlabs.ai",
    careersUrl: "https://www.vaticlabs.ai/careers/"
  },
  verkada: {
    websiteUrl: "https://www.verkada.com",
    careersUrl: "https://www.verkada.com/careers/"
  },
  winton: {
    websiteUrl: "https://www.winton.com",
    careersUrl: "https://www.winton.com/opportunities"
  },
  apple: {
    websiteUrl: "https://www.apple.com",
    careersUrl: "https://jobs.apple.com"
  },
  "akuna-capital": {
    websiteUrl: "https://akunacapital.com",
    careersUrl: "https://akunacapital.com/careers"
  },
  exoduspoint: {
    websiteUrl: "https://www.exoduspoint.com",
    careersUrl: "https://www.exoduspoint.com/careers"
  },
  "man-group": {
    websiteUrl: "https://www.man.com",
    careersUrl: "https://www.man.com/careers"
  },
  point72: {
    websiteUrl: "https://www.point72.com",
    careersUrl: "https://careers.point72.com/"
  },
  schonfeld: {
    websiteUrl: "https://www.schonfeld.com",
    careersUrl: "https://www.schonfeld.com/careers/"
  },
  "squarepoint-capital": {
    websiteUrl: "https://www.squarepoint-capital.com",
    careersUrl: "https://www.squarepoint-capital.com/open-opportunities"
  },
  "transmarket-group": {
    websiteUrl: "https://www.transmarketgroup.com",
    careersUrl: "https://www.transmarketgroup.com/careers"
  },
  "valkyrie-trading": {
    websiteUrl: "https://www.valkyrietrading.com",
    careersUrl: "https://www.valkyrietrading.com/careers"
  },
  worldquant: {
    websiteUrl: "https://www.worldquant.com",
    careersUrl: "https://www.worldquant.com/career-listing/"
  },
  adobe: {
    websiteUrl: "https://www.adobe.com",
    careersUrl: "https://careers.adobe.com/us/en/search-results"
  },
  affirm: {
    websiteUrl: "https://www.affirm.com",
    careersUrl: "https://www.affirm.com/careers/"
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
  anthropic: {
    websiteUrl: "https://www.anthropic.com",
    careersUrl: "https://www.anthropic.com/careers"
  },
  arm: {
    websiteUrl: "https://www.arm.com",
    careersUrl: "https://careers.arm.com/search-jobs"
  },
  atlassian: {
    websiteUrl: "https://www.atlassian.com",
    careersUrl: "https://www.atlassian.com/company/careers/all-jobs"
  },
  block: {
    websiteUrl: "https://block.xyz",
    careersUrl: "https://block.xyz/careers"
  },
  bloomberg: {
    websiteUrl: "https://www.bloomberg.com",
    careersUrl: "https://www.bloomberg.com/company/careers"
  },
  box: {
    websiteUrl: "https://www.box.com",
    careersUrl: "https://careers.box.com/en/"
  },
  brex: {
    websiteUrl: "https://www.brex.com",
    careersUrl: "https://www.brex.com/careers/"
  },
  broadcom: {
    websiteUrl: "https://www.broadcom.com",
    careersUrl: "https://www.broadcom.com/company/careers"
  },
  chime: {
    websiteUrl: "https://www.chime.com",
    careersUrl: "https://careers.chime.com/jobs/"
  },
  cisco: {
    websiteUrl: "https://www.cisco.com",
    careersUrl: "https://careers.cisco.com/global/en/"
  },
  cursor: {
    websiteUrl: "https://cursor.com",
    careersUrl: "https://cursor.com/careers"
  },
  doordash: {
    websiteUrl: "https://www.doordash.com",
    careersUrl: "https://careers.doordash.com"
  },
  google: {
    websiteUrl: "https://about.google",
    careersUrl: "https://www.google.com/about/careers/applications"
  },
  github: {
    websiteUrl: "https://github.com",
    careersUrl: "https://www.github.careers/careers-home"
  },
  gitlab: {
    websiteUrl: "https://about.gitlab.com",
    careersUrl: "https://about.gitlab.com/jobs/all-jobs/"
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
  "citadel": {
    websiteUrl: "https://www.citadel.com",
    careersUrl: "https://www.citadel.com/careers/open-opportunities/"
  },
  "citadel-securities": {
    websiteUrl: "https://www.citadelsecurities.com",
    careersUrl: "https://www.citadelsecurities.com/careers/open-opportunities/"
  },
  "de-shaw": {
    websiteUrl: "https://www.deshaw.com",
    careersUrl: "https://www.deshaw.com/careers"
  },
  "g-research": {
    websiteUrl: "https://www.gresearch.com",
    careersUrl: "https://www.gresearch.com/vacancies/"
  },
  millennium: {
    websiteUrl: "https://www.mlp.com",
    careersUrl: "https://career.mlp.com/careers"
  },
  stripe: {
    websiteUrl: "https://stripe.com",
    careersUrl: "https://stripe.com/jobs"
  },
  sig: {
    websiteUrl: "https://sig.com",
    careersUrl: "https://careers.sig.com/jobs"
  },
  slack: {
    websiteUrl: "https://slack.com",
    careersUrl: "https://slack.com/careers"
  },
  splunk: {
    websiteUrl: "https://www.splunk.com",
    careersUrl: "https://careers.cisco.com/global/en/splunk"
  },
  square: {
    websiteUrl: "https://squareup.com",
    careersUrl: "https://block.xyz/careers/jobs?businessUnits[]=square"
  },
  susquehanna: {
    websiteUrl: "https://sig.com",
    careersUrl: "https://careers.sig.com/jobs"
  },
  "two-sigma": {
    websiteUrl: "https://www.twosigma.com",
    careersUrl: "https://careers.twosigma.com/"
  },
  "xr-trading": {
    websiteUrl: "https://www.xrtrading.com",
    careersUrl:
      "https://recruiting.paylocity.com/recruiting/jobs/All/5c109104-7c4d-415c-9ee4-54e3af55f9e7/XR-Trading-LLC"
  },
  yelp: {
    websiteUrl: "https://www.yelp.com",
    careersUrl: "https://www.yelp.careers/us/en"
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
  crowdstrike: {
    websiteUrl: "https://www.crowdstrike.com",
    careersUrl: "https://www.crowdstrike.com/en-us/careers/"
  },
  databricks: {
    websiteUrl: "https://www.databricks.com",
    careersUrl: "https://www.databricks.com/company/careers/open-positions"
  },
  datadog: {
    websiteUrl: "https://www.datadoghq.com",
    careersUrl: "https://careers.datadoghq.com"
  },
  "dell-technologies": {
    websiteUrl: "https://www.dell.com",
    careersUrl: "https://jobs.dell.com/"
  },
  discord: {
    websiteUrl: "https://discord.com",
    careersUrl: "https://discord.com/careers"
  },
  dropbox: {
    websiteUrl: "https://www.dropbox.com",
    careersUrl: "https://jobs.dropbox.com/all-jobs"
  },
  duolingo: {
    websiteUrl: "https://www.duolingo.com",
    careersUrl: "https://careers.duolingo.com/"
  },
  elastic: {
    websiteUrl: "https://www.elastic.co",
    careersUrl: "https://www.elastic.co/careers"
  },
  "belvedere-trading": {
    websiteUrl: "https://www.belvederetrading.com",
    careersUrl: "https://www.belvederetrading.com/our-positions"
  },
  ctc: {
    websiteUrl: "https://www.ctccapital.com",
    careersUrl: "https://www.ctccapital.com/careers"
  },
  drw: {
    websiteUrl: "https://www.drw.com",
    careersUrl: "https://www.drw.com/work-at-drw/listings"
  },
  "five-rings": {
    websiteUrl: "https://fiverings.com",
    careersUrl: "https://fiverings.com/careers/"
  },
  figma: {
    websiteUrl: "https://www.figma.com",
    careersUrl: "https://www.figma.com/careers"
  },
  fivetran: {
    websiteUrl: "https://www.fivetran.com",
    careersUrl: "https://www.fivetran.com/careers"
  },
  "flow-traders": {
    websiteUrl: "https://www.flowtraders.com",
    careersUrl: "https://www.flowtraders.com/careers/"
  },
  "geneva-trading": {
    websiteUrl: "https://www.genevatrading.com",
    careersUrl: "https://www.genevatrading.com/career-in-trading/"
  },
  "hudson-river-trading": {
    websiteUrl: "https://www.hudsonrivertrading.com",
    careersUrl: "https://www.hudsonrivertrading.com/careers/"
  },
  imc: {
    websiteUrl: "https://www.imc.com",
    careersUrl: "https://www.imc.com/us/careers/"
  },
  "hewlett-packard-enterprise": {
    websiteUrl: "https://www.hpe.com",
    careersUrl: "https://careers.hpe.com/us/en/home"
  },
  ibm: {
    websiteUrl: "https://www.ibm.com",
    careersUrl: "https://www.ibm.com/careers/search"
  },
  intel: {
    websiteUrl: "https://www.intel.com",
    careersUrl: "https://jobs.intel.com/en"
  },
  instacart: {
    websiteUrl: "https://www.instacart.com",
    careersUrl: "https://www.instacart.careers/"
  },
  "jane-street": {
    websiteUrl: "https://www.janestreet.com",
    careersUrl: "https://www.janestreet.com/join-jane-street/open-roles/"
  },
  "jump-trading": {
    websiteUrl: "https://www.jumptrading.com",
    careersUrl: "https://www.jumptrading.com/hr/students-new-grads"
  },
  marvell: {
    websiteUrl: "https://www.marvell.com",
    careersUrl: "https://www.marvell.com/company/careers.html"
  },
  "maven-securities": {
    websiteUrl: "https://www.mavensecurities.com",
    careersUrl: "https://www.mavensecurities.com/jobs/"
  },
  micron: {
    websiteUrl: "https://www.micron.com",
    careersUrl: "https://www.micron.com/about/careers"
  },
  mongodb: {
    websiteUrl: "https://www.mongodb.com",
    careersUrl: "https://www.mongodb.com/careers"
  },
  "old-mission": {
    websiteUrl: "https://www.oldmissioncapital.com",
    careersUrl: "https://www.oldmissioncapital.com/careers/"
  },
  vercel: {
    websiteUrl: "https://vercel.com",
    careersUrl: "https://vercel.com/careers"
  },
  notion: {
    websiteUrl: "https://www.notion.so",
    careersUrl: "https://www.notion.so/careers"
  },
  okta: {
    websiteUrl: "https://www.okta.com",
    careersUrl: "https://www.okta.com/company/careers/"
  },
  oracle: {
    websiteUrl: "https://www.oracle.com",
    careersUrl: "https://careers.oracle.com"
  },
  "palo-alto-networks": {
    websiteUrl: "https://www.paloaltonetworks.com",
    careersUrl: "https://jobs.paloaltonetworks.com/en"
  },
  palantir: {
    websiteUrl: "https://www.palantir.com",
    careersUrl: "https://www.palantir.com/careers/"
  },
  "pdt-partners": {
    websiteUrl: "https://www.pdtpartners.com",
    careersUrl: "https://www.pdtpartners.com/careers/"
  },
  perplexity: {
    websiteUrl: "https://www.perplexity.ai",
    careersUrl: "https://www.perplexity.ai/hub/careers"
  },
  pinterest: {
    websiteUrl: "https://www.pinterest.com",
    careersUrl: "https://www.pinterestcareers.com/"
  },
  qualcomm: {
    websiteUrl: "https://www.qualcomm.com",
    careersUrl: "https://careers.qualcomm.com/careers"
  },
  "qube-research-and-technologies": {
    websiteUrl: "https://www.qube-rt.com",
    careersUrl: "https://www.qube-rt.com/careers/"
  },
  ramp: {
    websiteUrl: "https://ramp.com",
    careersUrl: "https://ramp.com/careers"
  },
  reddit: {
    websiteUrl: "https://www.redditinc.com",
    careersUrl: "https://redditinc.com/careers"
  },
  robinhood: {
    websiteUrl: "https://www.robinhood.com",
    careersUrl: "https://careers.robinhood.com/"
  },
  roblox: {
    websiteUrl: "https://www.roblox.com",
    careersUrl: "https://careers.roblox.com/"
  },
  salesforce: {
    websiteUrl: "https://www.salesforce.com",
    careersUrl: "https://careers.salesforce.com/en/jobs/"
  },
  samsara: {
    websiteUrl: "https://www.samsara.com",
    careersUrl: "https://www.samsara.com/careers"
  },
  sap: {
    websiteUrl: "https://www.sap.com",
    careersUrl: "https://jobs.sap.com/"
  },
  "scale-ai": {
    websiteUrl: "https://scale.com",
    careersUrl: "https://scale.com/careers"
  },
  servicenow: {
    websiteUrl: "https://www.servicenow.com",
    careersUrl: "https://careers.servicenow.com"
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
  "texas-instruments": {
    websiteUrl: "https://www.ti.com",
    careersUrl: "https://careers.ti.com/en/sites/CX"
  },
  tiktok: {
    websiteUrl: "https://www.tiktok.com",
    careersUrl: "https://lifeattiktok.com"
  },
  toast: {
    websiteUrl: "https://www.toasttab.com",
    careersUrl: "https://careers.toasttab.com/"
  },
  "tower-research-capital": {
    websiteUrl: "https://www.tower-research.com",
    careersUrl: "https://www.tower-research.com/open-positions/"
  },
  twilio: {
    websiteUrl: "https://www.twilio.com",
    careersUrl: "https://www.twilio.com/company/jobs"
  },
  uber: {
    websiteUrl: "https://www.uber.com",
    careersUrl: "https://www.uber.com/us/en/careers"
  },
  unity: {
    websiteUrl: "https://unity.com",
    careersUrl: "https://unity.com/careers"
  },
  waymo: {
    websiteUrl: "https://waymo.com",
    careersUrl: "https://careers.withwaymo.com/"
  },
  workday: {
    websiteUrl: "https://www.workday.com",
    careersUrl: "https://workday.wd5.myworkdayjobs.com/Workday"
  },
  vmware: {
    websiteUrl: "https://www.vmware.com",
    careersUrl: "https://www.broadcom.com/company/careers"
  },
  "virtu-financial": {
    websiteUrl: "https://www.virtu.com",
    careersUrl: "https://www.virtu.com/careers/"
  },
  "wolverine-trading": {
    websiteUrl: "https://www.wolve.com",
    careersUrl: "https://www.wolve.com/careers/"
  },
  yahoo: {
    websiteUrl: "https://www.yahoo.com",
    careersUrl: "https://www.yahooinc.com/careers/"
  },
  zoom: {
    websiteUrl: "https://www.zoom.com",
    careersUrl: "https://careers.zoom.us/home"
  },
  zscaler: {
    websiteUrl: "https://www.zscaler.com",
    careersUrl: "https://www.zscaler.com/careers"
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
    companySlug: "meta",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Meta careers search",
    sourceIdentifier: "meta-careers-intern",
    sourceUrl: "https://www.facebook.com/api/graphql/",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      docId: "26228555073499023",
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "meta-careers-search" },
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
    companySlug: "micron",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Micron careers via PCSX",
    sourceIdentifier: "micron-pcsx",
    sourceUrl: "https://micron.eightfold.ai/api/pcsx/search?domain=micron.com&query=intern",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { pageSize: 10, maxPages: 12, rateLimitMs: 1500 },
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
    companySlug: "anthropic",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "anthropic",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs?content=true",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "arm",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official Arm careers search",
    sourceIdentifier: "arm-talentbrew-intern",
    sourceUrl: "https://careers.arm.com/search-jobs/intern",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { maxPages: 4, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "talentbrew-search" },
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
    companySlug: "brex",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "brex",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/brex/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "broadcom",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Broadcom careers via Workday",
    sourceIdentifier: "broadcom-external-career",
    sourceUrl: "https://broadcom.wd1.myworkdayjobs.com/wday/cxs/broadcom/External_Career/jobs",
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
    companySlug: "cisco",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Cisco careers via Phenom",
    sourceIdentifier: "cisco-phenom",
    sourceUrl: "https://careers.cisco.com/widgets",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      refNum: "CISCISGLOBAL",
      lang: "en_global",
      locale: "en_global",
      country: "global",
      pageId: "page4",
      detailBaseUrl: "https://careers.cisco.com/global/en/job",
      allFields: ["category", "country", "state", "city", "type"],
      pageSize: 10,
      maxPages: 6,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "phenom-refine-search" },
    isActive: true
  },
  {
    companySlug: "bloomberg",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official Bloomberg careers search",
    sourceIdentifier: "bloomberg-avature",
    sourceUrl:
      "https://bloomberg.avature.net/careers/SearchJobs/?jobOffset=0&jobRecordsPerPage=50&keywords=intern",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { pageSize: 50, maxPages: 12, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "bloomberg-avature-search" },
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
    companySlug: "crowdstrike",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official CrowdStrike careers via Workday",
    sourceIdentifier: "crowdstrike-workday",
    sourceUrl: "https://crowdstrike.wd5.myworkdayjobs.com/wday/cxs/crowdstrike/crowdstrikecareers/jobs",
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
    companySlug: "cursor",
    sourceType: SourceType.ASHBY,
    sourceName: "Official careers site via Ashby",
    sourceIdentifier: "cursor",
    sourceUrl: "https://jobs.ashbyhq.com/cursor",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: { rateLimitMs: 1000 },
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
    companySlug: "dell-technologies",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Dell careers via Oracle HCM",
    sourceIdentifier: "dell-oracle-hcm",
    sourceUrl:
      "https://iawmqy.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      siteNumber: "CX_1001",
      searchText: "intern",
      selectedLocationsFacet: "300000000471434",
      detailBaseUrl:
        "https://iawmqy.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/careers/job",
      pageSize: 24,
      maxPages: 4,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "oracle-hcm-search" },
    isActive: true
  },
  {
    companySlug: "doordash",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "doordashusa",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/doordashusa/jobs?content=true",
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
    companySlug: "elastic",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "elastic",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/elastic/jobs?content=true",
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
    companySlug: "hewlett-packard-enterprise",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official HPE careers via Phenom",
    sourceIdentifier: "hpe-phenom",
    sourceUrl: "https://careers.hpe.com/widgets",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      refNum: "HPE1US",
      lang: "en_us",
      locale: "en_us",
      country: "us",
      pageId: "page20",
      detailBaseUrl: "https://careers.hpe.com/us/en/job",
      allFields: ["category", "country", "state", "city", "type"],
      pageSize: 10,
      maxPages: 6,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "phenom-refine-search" },
    isActive: true
  },
  {
    companySlug: "ibm",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official IBM careers search",
    sourceIdentifier: "ibm-careers-search",
    sourceUrl: "https://www-api.ibm.com/search/api/v1/ibmcom/appid/careers/responseFormat/json",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      appId: "careers",
      scope: "careers2",
      sortBy: "-dcdate",
      detailBaseUrl: "https://careers.ibm.com/en_US/careers/JobDetail",
      source: "WEB_Search_NA",
      pageSize: 50,
      maxPages: 8,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "ibm-careers-search" },
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
    companySlug: "marvell",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Marvell careers via Workday",
    sourceIdentifier: "marvell-workday",
    sourceUrl: "https://marvell.wd1.myworkdayjobs.com/wday/cxs/marvell/MarvellCareers/jobs",
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
    companySlug: "okta",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "okta",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/okta/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "oracle",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Oracle careers search",
    sourceIdentifier: "oracle-hcm-jobsearch",
    sourceUrl:
      "https://eeho.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      siteNumber: "CX_45001",
      searchText: "intern",
      selectedLocationsFacet: "300000000149325",
      pageSize: 24,
      maxPages: 10,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "oracle-hcm-search" },
    isActive: true
  },
  {
    companySlug: "palo-alto-networks",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Palo Alto Networks careers via Workday",
    sourceIdentifier: "palo-alto-networks-workday",
    sourceUrl:
      "https://paloaltonetworks.wd5.myworkdayjobs.com/wday/cxs/paloaltonetworks/panwexternalcareers/jobs",
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
    companySlug: "perplexity",
    sourceType: SourceType.ASHBY,
    sourceName: "Official careers site via Ashby",
    sourceIdentifier: "perplexity",
    sourceUrl: "https://jobs.ashbyhq.com/perplexity",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: { rateLimitMs: 1000 },
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
    companySlug: "ramp",
    sourceType: SourceType.ASHBY,
    sourceName: "Official careers site via Ashby",
    sourceIdentifier: "ramp",
    sourceUrl: "https://jobs.ashbyhq.com/ramp",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: { rateLimitMs: 1000 },
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
    companySlug: "roblox",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "roblox",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/roblox/jobs?content=true",
    pollingEnabled: true,
    priority: 8,
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
    companySlug: "sap",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official SAP jobs RSS",
    sourceIdentifier: "sap-rss-internship",
    sourceUrl: "https://jobs.sap.com/services/rss/job/?locale=en_US&keywords=(internship)",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "generic-rss-items" },
    isActive: true
  },
  {
    companySlug: "scale-ai",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "scaleai",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/scaleai/jobs?content=true",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "servicenow",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official ServiceNow careers API",
    sourceIdentifier: "servicenow-smartrecruiters",
    sourceUrl: "https://api.smartrecruiters.com/v1/companies/ServiceNow/postings",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      pageSize: 100,
      maxPages: 3,
      fetchDetails: true,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "smartrecruiters-postings" },
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
    companySlug: "belvedere-trading",
    sourceType: SourceType.LEVER,
    sourceName: "Official careers site via Lever",
    sourceIdentifier: "belvederetrading",
    sourceUrl: "https://api.lever.co/v0/postings/belvederetrading?mode=json",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { limit: 100, rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "ctc",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "chicagotrading",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/chicagotrading/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "drw",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official DRW careers listings",
    sourceIdentifier: "drw-listings",
    sourceUrl: "https://www.drw.com/work-at-drw/listings",
    pollingEnabled: true,
    priority: 6,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "drw-listings" },
    isActive: true
  },
  {
    companySlug: "flow-traders",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "flowtraders",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/flowtraders/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "geneva-trading",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "genevatrading",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/genevatrading/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
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
    companySlug: "jane-street",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "janestreet",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/janestreet/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "jump-trading",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "jumptrading",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/jumptrading/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "maven-securities",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "mavensecuritiesholdingltd",
    sourceUrl:
      "https://boards-api.greenhouse.io/v1/boards/mavensecuritiesholdingltd/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "pdt-partners",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "pdtpartners",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/pdtpartners/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "qube-research-and-technologies",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "quberesearchandtechnologies",
    sourceUrl:
      "https://boards-api.greenhouse.io/v1/boards/quberesearchandtechnologies/jobs?content=true",
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
    companySlug: "shopify",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official Shopify careers page",
    sourceIdentifier: "shopify-careers",
    sourceUrl: "https://www.shopify.com/jobs/",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "shopify-careers" },
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
    companySlug: "tiktok",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Life at TikTok careers API",
    sourceIdentifier: "tiktok-life-at-tiktok",
    sourceUrl: "https://api.lifeattiktok.com/api/v1/public/supplier/search/job/posts",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      recruitmentIds: ["202"],
      countryName: "United States of America",
      filtersUrl: "https://api.lifeattiktok.com/api/v1/public/supplier/config/job/filters",
      pageSize: 50,
      maxPagesPerLocation: 3,
      locationBatchSize: 20,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "tiktok-search" },
    isActive: true
  },
  {
    companySlug: "texas-instruments",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Texas Instruments careers via Oracle HCM",
    sourceIdentifier: "texas-instruments-oracle-hcm",
    sourceUrl:
      "https://edbz.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      siteNumber: "CX",
      searchText: "intern",
      selectedLocationsFacet: "300000000361862",
      detailBaseUrl: "https://careers.ti.com/en/sites/CX/job",
      pageSize: 24,
      maxPages: 4,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "oracle-hcm-search" },
    isActive: true
  },
  {
    companySlug: "tower-research-capital",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "towerresearchcapital",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/towerresearchcapital/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "old-mission",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "oldmissioncapital",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/oldmissioncapital/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
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
    companySlug: "uber",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Uber careers search",
    sourceIdentifier: "uber-careers-search",
    sourceUrl: "https://www.uber.com/api/loadSearchJobsResults?localeCode=en",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { query: "intern", pageSize: 25, maxPages: 4, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "uber-search" },
    isActive: true
  },
  {
    companySlug: "unity",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "unity3d",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/unity3d/jobs?content=true",
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
    companySlug: "vmware",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Broadcom careers via Workday",
    sourceIdentifier: "broadcom-external-career",
    sourceUrl: "https://broadcom.wd1.myworkdayjobs.com/wday/cxs/broadcom/External_Career/jobs",
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
    companySlug: "yahoo",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Yahoo careers via Workday",
    sourceIdentifier: "ouryahoo-careers",
    sourceUrl: "https://ouryahoo.wd5.myworkdayjobs.com/wday/cxs/ouryahoo/careers/jobs",
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
    companySlug: "zscaler",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "zscaler",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/zscaler/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "virtu-financial",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "virtu",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/virtu/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "wolverine-trading",
    sourceType: SourceType.LEVER,
    sourceName: "Official careers site via Lever",
    sourceIdentifier: "wolve",
    sourceUrl: "https://api.lever.co/v0/postings/wolve?mode=json",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { limit: 100, rateLimitMs: 1000 },
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
  },
  {
    companySlug: "de-shaw",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official D. E. Shaw careers page",
    sourceIdentifier: "deshaw-careers",
    sourceUrl: "https://www.deshaw.com/careers",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "deshaw-careers" },
    isActive: true
  },
  {
    companySlug: "g-research",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official G-Research vacancies page",
    sourceIdentifier: "gresearch-vacancies",
    sourceUrl: "https://www.gresearch.com/vacancies/",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { maxPages: 4, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "gresearch-vacancies" },
    isActive: true
  },
  {
    companySlug: "millennium",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Millennium careers API via Eightfold",
    sourceIdentifier: "millennium-eightfold",
    sourceUrl:
      "https://mlp.eightfold.ai/api/apply/v2/jobs?domain=mlp.com&pid=0&sort_by=relevance",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: { query: "internship", pageSize: 10, maxPages: 4, rateLimitMs: 1500 },
    parserConfigJson: { parserId: "eightfold-jobs" },
    isActive: true
  },
  {
    companySlug: "sig",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official SIG careers API via iCIMS/Jibe",
    sourceIdentifier: "sig-jibe",
    sourceUrl: "https://careers.sig.com/api/jobs?limit=20&lang=en-US",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      queryParamName: "keywords",
      detailUrlBase: "https://careers.sig.com/jobs/",
      maxPages: 4,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "jibe-jobs" },
    isActive: true
  },
  {
    companySlug: "slack",
    sourceType: SourceType.WORKDAY,
    sourceName: "Official Slack careers via Salesforce Workday",
    sourceIdentifier: "salesforce-slack-workday",
    sourceUrl: "https://salesforce.wd12.myworkdayjobs.com/wday/cxs/salesforce/Slack/jobs",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: {
      pageSize: 20,
      maxPages: 4,
      searchText: "intern",
      rateLimitMs: 1500
    },
    isActive: true
  },
  {
    companySlug: "splunk",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Splunk careers via Cisco Phenom",
    sourceIdentifier: "cisco-phenom-splunk",
    sourceUrl: "https://careers.cisco.com/widgets",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "splunk intern",
      refNum: "CISCISGLOBAL",
      lang: "en_global",
      locale: "en_global",
      country: "global",
      pageId: "page4",
      detailBaseUrl: "https://careers.cisco.com/global/en/job",
      allFields: ["category", "country", "state", "city", "type"],
      pageSize: 10,
      maxPages: 4,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "phenom-refine-search" },
    isActive: true
  },
  {
    companySlug: "square",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official Square careers via Block Greenhouse",
    sourceIdentifier: "block-square",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/block/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: {
      content: true,
      metadataFieldFilters: { "Business Unit": ["Square"] },
      rateLimitMs: 1000
    },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "susquehanna",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Susquehanna careers API via iCIMS/Jibe",
    sourceIdentifier: "susquehanna-jibe",
    sourceUrl: "https://careers.sig.com/api/jobs?limit=20&lang=en-US",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      queryParamName: "keywords",
      detailUrlBase: "https://careers.sig.com/jobs/",
      maxPages: 4,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "jibe-jobs" },
    isActive: true
  },
  {
    companySlug: "two-sigma",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official Two Sigma careers page",
    sourceIdentifier: "two-sigma-avature",
    sourceUrl: "https://careers.twosigma.com/",
    pollingEnabled: true,
    priority: 6,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "two-sigma-avature-cards" },
    isActive: true
  },
  {
    companySlug: "xr-trading",
    sourceType: SourceType.CUSTOM_HTML,
    sourceName: "Official XR Trading careers page via Paylocity",
    sourceIdentifier: "xr-trading-paylocity",
    sourceUrl:
      "https://recruiting.paylocity.com/recruiting/jobs/All/5c109104-7c4d-415c-9ee4-54e3af55f9e7/XR-Trading-LLC",
    pollingEnabled: true,
    priority: 6,
    requestConfigJson: { rateLimitMs: 1500 },
    parserConfigJson: { parserId: "paylocity-page-data" },
    isActive: true
  },
  {
    companySlug: "yelp",
    sourceType: SourceType.CUSTOM_API,
    sourceName: "Official Yelp careers API via Phenom",
    sourceIdentifier: "yelp-phenom",
    sourceUrl: "https://www.yelp.careers/widgets",
    pollingEnabled: true,
    priority: 7,
    requestConfigJson: {
      query: "intern",
      refNum: "YELPUS",
      lang: "en_us",
      locale: "en_us",
      country: "us",
      pageId: "page18",
      detailBaseUrl: "https://www.yelp.careers/us/en/job",
      allFields: ["category", "country", "state", "city", "type"],
      pageSize: 10,
      maxPages: 4,
      rateLimitMs: 1500
    },
    parserConfigJson: { parserId: "phenom-refine-search" },
    isActive: true
  },
  {
    companySlug: "affirm",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "affirm",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/affirm/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "box",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "boxinc",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/boxinc/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "chime",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "chime",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/chime/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "discord",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "discord",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/discord/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "duolingo",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "duolingo",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/duolingo/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "fivetran",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "fivetran",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/fivetran/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "gitlab",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "gitlab",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "instacart",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "instacart",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/instacart/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "samsara",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "samsara",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/samsara/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "toast",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "toast",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/toast/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "aqr",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "aqr",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/aqr/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "aquatic-capital-management",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "aquaticcapitalmanagement",
    sourceUrl:
      "https://boards-api.greenhouse.io/v1/boards/aquaticcapitalmanagement/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "exoduspoint",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "exoduspoint",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/exoduspoint/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "man-group",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "mangroup",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/mangroup/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "point72",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "point72",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/point72/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "schonfeld",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "schonfeld",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/schonfeld/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "squarepoint-capital",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "squarepointcapital",
    sourceUrl:
      "https://boards-api.greenhouse.io/v1/boards/squarepointcapital/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "transmarket-group",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "transmarketgroup",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/transmarketgroup/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "valkyrie-trading",
    sourceType: SourceType.LEVER,
    sourceName: "Official careers site via Lever",
    sourceIdentifier: "valkyrietrading",
    sourceUrl: "https://api.lever.co/v0/postings/valkyrietrading?mode=json",
    pollingEnabled: true,
    priority: 9,
    requestConfigJson: { mode: "json", rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "worldquant",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "worldquant",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/worldquant/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "bluecrest-capital-management",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "bluecrestcapitalmanagement",
    sourceUrl:
      "https://boards-api.greenhouse.io/v1/boards/bluecrestcapitalmanagement/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "capital-fund-management",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "cfm",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/cfm/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "engineers-gate",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "engineersgate",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/engineersgate/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "gsa-capital",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "gsacapital",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/gsacapital/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "graham-capital-management",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "grahamcapitalmanagement",
    sourceUrl:
      "https://boards-api.greenhouse.io/v1/boards/grahamcapitalmanagement/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "marshall-wace",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "marshallwace",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/marshallwace/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "quadrature-capital",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "quadraturecapital",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/quadraturecapital/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "the-voleon-group",
    sourceType: SourceType.ASHBY,
    sourceName: "Official careers site via Ashby",
    sourceIdentifier: "voleon",
    sourceUrl: "https://jobs.ashbyhq.com/voleon",
    pollingEnabled: true,
    priority: 8,
    requestConfigJson: { rateLimitMs: 1000 },
    isActive: true
  },
  {
    companySlug: "vatic-labs",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "vaticlabs",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/vaticlabs/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "winton",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "winton",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/winton/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "anduril",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "andurilindustries",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/andurilindustries/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "astranis",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "astranis",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/astranis/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "aurora",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "aurorainnovation",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/aurorainnovation/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "cockroach-labs",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "cockroachlabs",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/cockroachlabs/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "coreweave",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "coreweave",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/coreweave/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "launchdarkly",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "launchdarkly",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/launchdarkly/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "neuralink",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "neuralink",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/neuralink/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "nuro",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "nuro",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/nuro/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "rubrik",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "rubrik",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/rubrik/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  },
  {
    companySlug: "verkada",
    sourceType: SourceType.GREENHOUSE,
    sourceName: "Official careers site via Greenhouse",
    sourceIdentifier: "verkada",
    sourceUrl: "https://boards-api.greenhouse.io/v1/boards/verkada/jobs?content=true",
    pollingEnabled: true,
    priority: 10,
    requestConfigJson: { content: true, rateLimitMs: 1000 },
    parserConfigJson: { includeDepartments: true },
    isActive: true
  }
];
