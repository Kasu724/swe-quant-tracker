const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { createRequire } = require("node:module");
const { spawn } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");
const { PrismaClient } = require("@prisma/client");
const { startEmbeddedDatabase } = require("../runtime/database.cjs");

const rootDirectory = path.resolve(__dirname, "..", "..", "..");
const schemaPath = path.join(__dirname, "..", "runtime", "schema.sql");
const keepRunning = process.argv.includes("--keep-running");
const requestedPort = Number(process.env.FILTER_TEST_PORT ?? 0);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForWeb(baseUrl, child) {
  const startedAt = Date.now();
  let lastError = "";
  while (Date.now() - startedAt < 120_000) {
    if (child.exitCode !== null) throw new Error(`Next exited before readiness (${child.exitCode}). ${lastError}`);
    try {
      const response = await fetch(`${baseUrl}/api/internships?limit=1`);
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for Next (${lastError})`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill("SIGTERM");
  });
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function createFixtures(prisma) {
  const company = await prisma.company.create({
    data: { name: "Filter Fixture Co", slug: "filter-fixture", companyBucket: "FAANG" }
  });
  const source = {
    sourceType: "CUSTOM_API",
    sourceName: "Filter fixture source",
    sourceIdentifier: "filter-fixture",
    sourceUrl: "https://example.invalid/filter-fixture"
  };
  const location = (raw, code, city, region, country) => ({
    raw,
    display: raw,
    key: raw.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    city,
    region,
    country,
    countryCode: code,
    isUs: code === "US"
  });
  const postings = [
    ["us-intern", "Software Engineering Intern", true, false, "New York, NY", ["US"], [location("New York, NY", "US", "New York", "New York", "United States")]],
    ["ca-intern", "Software Engineering Intern", true, false, "Toronto, Canada", ["CA"], [location("Toronto, Canada", "CA", "Toronto", "Ontario", "Canada")]],
    ["uk-new-grad", "Software Engineer, New Grad", false, true, "London, United Kingdom", ["GB"], [location("London, United Kingdom", "GB", "London", undefined, "United Kingdom")]],
    ["experienced", "Senior Software Engineer", false, false, "Berlin, Germany", ["DE"], [location("Berlin, Germany", "DE", "Berlin", undefined, "Germany")]],
    ["us-new-grad", "Software Engineer, New Grad", false, true, "Austin, TX", ["US"], [location("Austin, TX", "US", "Austin", "Texas", "United States")]],
    ["inactive-intern", "Software Engineering Intern", true, false, "Boston, MA", ["US"], [location("Boston, MA", "US", "Boston", "Massachusetts", "United States")]],
    ["multi-location", "Quantitative Developer Intern", true, false, "Toronto, Canada | Berlin, Germany", ["CA", "DE"], [location("Toronto, Canada", "CA", "Toronto", "Ontario", "Canada"), location("Berlin, Germany", "DE", "Berlin", undefined, "Germany")]],
    ["normalized-only", "Data Science, New Grad", false, true, null, ["CA"], [location("Montreal, Canada", "CA", "Montreal", "Quebec", "Canada")]],
    ["null-date", "Trading Analyst, New Grad", false, true, "Singapore", ["SG"], [location("Singapore", "SG", "Singapore", undefined, "Singapore")]],
    ["zero-pay", "Software Engineering Intern", true, false, "Vancouver, Canada", ["CA"], [location("Vancouver, Canada", "CA", "Vancouver", "British Columbia", "Canada")]],
    ["hidden-intern", "Software Engineering Intern", true, false, "Seattle, WA", ["US"], [location("Seattle, WA", "US", "Seattle", "Washington", "United States")]]
  ];
  const created = {};
  for (const [slug, title, internshipFlag, newGradFlag, locationRaw, locationCountries, locationsNormalized] of postings) {
    created[slug] = await prisma.internshipPosting.create({
      data: {
        companyId: company.id,
        slug,
        companyNameSnapshot: company.name,
        title,
        normalizedTitle: title.toLowerCase(),
        roleCategory: title.includes("Quant") ? "QUANT_DEV" : "SWE",
        internshipFlag,
        newGradFlag,
        locationRaw,
        locationCountries,
        locationsNormalized,
        remoteType: "ONSITE",
        compensationMin: slug === "zero-pay" ? 0 : slug === "ca-intern" ? 50 : null,
        compensationMax: slug === "zero-pay" ? 0 : slug === "ca-intern" ? 60 : null,
        compensationCurrency: "USD",
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        applicationUrl: `https://example.invalid/jobs/${slug}`,
        sourceUrl: `https://example.invalid/jobs/${slug}`,
        dedupeFingerprint: `filter-fixture-${slug}`,
        isActive: slug !== "inactive-intern",
        season: "SUMMER",
        year: 2027,
        discoveredAt: new Date("2026-08-01T00:00:00.000Z"),
        postingDate: slug === "null-date" ? null : new Date()
      }
    });
  }
  const user = await prisma.user.create({ data: { email: "local@swe-quant-tracker.invalid", alertEmailsEnabled: false } });
  await prisma.userApplicationState.create({
    data: { userId: user.id, internshipPostingId: created["hidden-intern"].id, state: "HIDDEN" }
  });
  return created;
}

async function jsonRequest(baseUrl, pathName, options) {
  const response = await fetch(`${baseUrl}${pathName}`, options);
  const body = await response.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = body; }
  assert(response.ok, `${options?.method ?? "GET"} ${pathName} returned ${response.status}: ${body.slice(0, 300)}`);
  return parsed;
}

async function runAssertions(baseUrl, created) {
  const all = await jsonRequest(baseUrl, "/api/internships?limit=2");
  assert(all.total === 8, `expected 8 default roles, got ${all.total}`);
  assert(all.listings.length === 2 && all.hasMore, "default pagination should return two rows and continue");
  const page2 = await jsonRequest(baseUrl, "/api/internships?limit=2&offset=2");
  assert(page2.total === 8 && page2.listings.length === 2, "second page should preserve total and page size");
  assert(new Set([...all.listings, ...page2.listings].map((row) => row.id)).size === 4, "pages should not duplicate rows");

  const canada = await jsonRequest(baseUrl, "/api/internships?country=CA&limit=100");
  assert(canada.total === 4, `expected 4 Canadian roles, got ${canada.total}`);
  const canadaNewGrad = await jsonRequest(baseUrl, "/api/internships?country=CA&positionType=NEW_GRAD&limit=100");
  assert(canadaNewGrad.total === 1 && canadaNewGrad.listings[0].slug === "normalized-only", "Canada + new grad should match normalized-only fixture");
  assert(canadaNewGrad.listings[0].locationRaw === "Montreal, Canada", "normalized-only locations should be displayed in results");
  const toronto = await jsonRequest(baseUrl, "/api/internships?country=CA&location=Toronto%2C%20Canada&limit=100");
  assert(toronto.total === 2, `expected two Toronto postings, got ${toronto.total}`);
  const mismatched = await jsonRequest(baseUrl, "/api/internships?country=CA&location=Berlin&limit=100");
  assert(mismatched.total === 0, "country and specific location must apply to the same normalized location");

  const internships = await jsonRequest(baseUrl, "/api/internships?positionType=INTERNSHIP&limit=100");
  const newGrad = await jsonRequest(baseUrl, "/api/internships?positionType=NEW_GRAD&limit=100");
  assert(internships.total === 4 && newGrad.total === 4, "position type counts should be independent and exhaustive");
  const zeroPay = await jsonRequest(baseUrl, "/api/internships?country=CA&payKnown=known&minimumPay=0&limit=100");
  assert(zeroPay.total === 2, "known pay minimum zero should include zero-pay and paid Canadian roles");
  const csvResponse = await fetch(`${baseUrl}/api/internships?country=CA&positionType=NEW_GRAD&format=csv`);
  const csv = await csvResponse.text();
  assert(csvResponse.ok && csv.includes("normalized-only") && csv.includes("company"), "CSV should use the same filtered rows");

  const detail = await jsonRequest(baseUrl, `/api/internships/${created["uk-new-grad"].slug}`);
  assert(detail.posting.slug === "uk-new-grad", "detail API should allow a non-US new grad posting");
  for (const [query, expected] of [
    ["payKnown=unknown&includeMissingPay=false", 0],
    ["payKnown=unknown", 6],
    ["minimumPay=60", 1],
    ["minimumPay=61", 0],
    ["activeOnly=false", 9],
    ["includeMissingLocation=false", 8],
    ["recent=7", 7],
    ["company=filter-fixture&bucket=FAANG&category=QUANT_DEV&season=SUMMER&year=2027&remote=ONSITE", 1],
    ["company=missing", 0], ["bucket=QUANT", 0], ["category=TRADING", 0],
    ["season=WINTER", 0], ["year=2028", 0], ["remote=REMOTE", 0],
    ["q=quantitative%20developer", 1], ["usOnly=true", 2],
    ["usOnly=true&country=CA", 4]
  ]) {
    const result = await jsonRequest(baseUrl, `/api/internships?${query}&limit=100`);
    assert(result.total === expected, `${query}: expected ${expected}, got ${result.total}`);
  }
  for (const sort of ["postingDate", "discoveredDate", "company", "pay", "location"]) {
    const rows = await jsonRequest(baseUrl, `/api/internships?sort=${sort}&limit=100`);
    const pagedIds = [];
    for (let offset = 0; offset < rows.total; offset += 2) {
      const page = await jsonRequest(baseUrl, `/api/internships?sort=${sort}&limit=2&offset=${offset}`);
      pagedIds.push(...page.listings.map((row) => row.id));
    }
    assert(JSON.stringify(pagedIds) === JSON.stringify(rows.listings.map((row) => row.id)), `${sort}: pagination must preserve exact ordering`);
  }
  for (const query of ["country=XX", "positionType=SENIOR", "minimumPay=-1"]) {
    const invalid = await fetch(`${baseUrl}/api/internships?${query}`);
    assert(invalid.status === 400, `${query} should reject invalid filters`);
  }
  const saved = await jsonRequest(baseUrl, "/api/saved-searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Canada new grads", filters: { countries: ["CA"], positionTypes: ["NEW_GRAD"] } })
  });
  assert(saved.savedSearch?.filterJson?.countries?.[0] === "CA", "saved search should persist country filter");
  const savedList = await jsonRequest(baseUrl, "/api/saved-searches");
  assert(savedList.savedSearches.some((entry) => entry.name === "Canada new grads"), "saved search should round-trip through GET");
}

async function main() {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "faang-quant-filter-pglite-"));
  let database;
  let prisma;
  let next;
  try {
    database = await startEmbeddedDatabase({ dataDirectory, schemaPath });
    prisma = new PrismaClient({ datasources: { db: { url: database.connectionUrl } } });
    const created = await createFixtures(prisma);
    const port = requestedPort > 0 ? requestedPort : await freePort();
    const environment = {
      ...process.env,
      DATABASE_URL: database.connectionUrl,
      DIRECT_URL: database.connectionUrl,
      NEXT_TELEMETRY_DISABLED: "1",
      FILTER_TEST_PORT: undefined
    };
    const webDirectory = path.join(rootDirectory, "apps", "web");
    const webRequire = createRequire(path.join(webDirectory, "package.json"));
    next = spawn(process.execPath, [webRequire.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: webDirectory,
      env: environment,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let logs = "";
    next.stdout.on("data", (chunk) => { logs += chunk.toString().slice(-4000); });
    next.stderr.on("data", (chunk) => { logs += chunk.toString().slice(-4000); });
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      await waitForWeb(baseUrl, next);
      await runAssertions(baseUrl, created);
    } catch (error) {
      console.error(logs.slice(-6000));
      throw error;
    }
    console.log(`Listing filter HTTP integration passed at ${baseUrl}.`);
    if (keepRunning) {
      console.log("Keeping the isolated server and database alive (--keep-running); press Ctrl+C to stop.");
      await new Promise((resolve) => {
        process.once("SIGINT", resolve);
        process.once("SIGTERM", resolve);
        process.stdin.resume();
        process.stdin.once("data", resolve);
      });
      process.stdin.pause();
    }
    if (logs.includes("error")) console.error(logs);
  } finally {
    await stopProcess(next);
    await prisma?.$disconnect();
    await database?.stop();
    const resolved = path.resolve(dataDirectory);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("faang-quant-filter-pglite-")) {
      throw new Error("Refusing to remove an unexpected filter-test database directory");
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
