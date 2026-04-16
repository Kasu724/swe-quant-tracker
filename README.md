# Internship Quant Tracker

Production-minded internship tracker focused on:

- FAANG, mega-cap tech, developer tools, infrastructure, and high-growth software companies
- Quant, trading, market making, hedge fund, and prop trading firms

The project prefers official structured ATS-backed public job data over brittle scraping. The current ingestion adapters target Greenhouse, Lever, Ashby, selected official careers HTML payloads, and Workday where the public endpoints are clean enough to integrate directly.

## Stack

- `Next.js` App Router
- `TypeScript`
- `PostgreSQL`
- `Prisma`
- `Tailwind CSS`
- `NextAuth` credentials auth with email verification
- background worker with recurring polling and digest scheduling
- monorepo with `pnpm` workspaces

## Monorepo Layout

```text
apps/
  web/       Next.js site, auth, pages, APIs, admin UI
  worker/    polling, normalization, dedupe, alert delivery
packages/
  config/    env parsing
  db/        Prisma schema, migration, seed data, client
  email/     mail provider abstraction and templates
  shared/    adapters, normalization, dedupe, filters, CSV, alert interfaces
  ui/        reusable Tailwind UI primitives
```

## Current Feature Set

- searchable internship listings page
- internship detail page
- companies page
- saved searches page
- user settings page
- admin dashboard
- credentials auth with verification emails
- favorites and application state tracking
- immediate email alerts and daily digests
- Greenhouse, Lever, and Ashby structured adapters
- normalization helpers for title, location, pay, season/year, internship detection, and role categorization
- canonical posting storage with source-record traceability
- duplicate detection and canonical merge tools
- CSV export for filtered listings

## Priority Target Universe

This is the intended big-tech plus quant/trading/hedge fund target universe for the project. Status reflects whether the repo currently seeds at least one active source for that company.

### FAANG / Big Tech / High-Paying SWE Coverage

| Company | Bucket | Status |
| --- | --- | --- |
| Apple | FAANG | Tracked |
| Amazon | FAANG | Tracked |
| Google | FAANG | Tracked |
| Meta | FAANG | Not yet tracked |
| Microsoft | FAANG | Tracked |
| Netflix | FAANG | Tracked |
| Nvidia | FAANG | Tracked |
| Tesla | FAANG | Not yet tracked |
| Adobe | BIG_TECH | Tracked |
| Airbnb | BIG_TECH | Tracked |
| AMD | BIG_TECH | Tracked |
| Asana | BIG_TECH | Tracked |
| Atlassian | BIG_TECH | Tracked |
| Block | BIG_TECH | Tracked |
| Bloomberg | BIG_TECH | Not yet tracked |
| Cloudflare | BIG_TECH | Tracked |
| Coinbase | BIG_TECH | Tracked |
| Databricks | BIG_TECH | Tracked |
| Datadog | BIG_TECH | Tracked |
| DoorDash | BIG_TECH | Not yet tracked |
| Dropbox | BIG_TECH | Tracked |
| Figma | BIG_TECH | Tracked |
| GitHub | BIG_TECH | Tracked |
| HubSpot | BIG_TECH | Tracked |
| Intel | BIG_TECH | Tracked |
| LinkedIn | BIG_TECH | Tracked |
| Lyft | BIG_TECH | Tracked |
| MongoDB | BIG_TECH | Tracked |
| Notion | BIG_TECH | Tracked |
| Oracle | BIG_TECH | Not yet tracked |
| Palantir | BIG_TECH | Tracked |
| Pinterest | BIG_TECH | Tracked |
| Qualcomm | BIG_TECH | Tracked |
| Reddit | BIG_TECH | Tracked |
| Robinhood | BIG_TECH | Tracked |
| Salesforce | BIG_TECH | Tracked |
| ServiceNow | BIG_TECH | Not yet tracked |
| Shopify | BIG_TECH | Not yet tracked |
| Snap | BIG_TECH | Tracked |
| Snowflake | BIG_TECH | Tracked |
| Spotify | BIG_TECH | Tracked |
| Stripe | BIG_TECH | Tracked |
| TikTok | BIG_TECH | Not yet tracked |
| Twilio | BIG_TECH | Tracked |
| Uber | BIG_TECH | Not yet tracked |
| Vercel | BIG_TECH | Tracked |
| Waymo | BIG_TECH | Tracked |
| Workday | BIG_TECH | Tracked |
| Zoom | BIG_TECH | Tracked |

### Quant / Trading / Hedge Fund Coverage

| Company | Status |
| --- | --- |
| Akuna Capital | Tracked |
| Belvedere Trading | Not yet tracked |
| Citadel | Not yet tracked |
| Citadel Securities | Not yet tracked |
| CTC | Not yet tracked |
| DE Shaw | Not yet tracked |
| DRW | Not yet tracked |
| Five Rings | Tracked |
| Flow Traders | Not yet tracked |
| G-Research | Not yet tracked |
| Geneva Trading | Not yet tracked |
| Hudson River Trading | Tracked |
| IMC | Tracked |
| Jane Street | Not yet tracked |
| Jump Trading | Not yet tracked |
| Maven Securities | Not yet tracked |
| Millennium | Not yet tracked |
| Old Mission | Not yet tracked |
| Optiver | Tracked |
| PDT Partners | Not yet tracked |
| Qube Research & Technologies | Not yet tracked |
| SIG | Not yet tracked |
| Susquehanna | Not yet tracked |
| Tower Research Capital | Not yet tracked |
| Two Sigma | Not yet tracked |
| Virtu Financial | Not yet tracked |
| Wolverine Trading | Not yet tracked |
| XR Trading | Not yet tracked |

## Currently Tracked Companies

The seeded tracked set is still intentionally curated, but it now includes both ATS-backed sources and direct official careers pages where the company exposes usable public listing data.

| Company | Bucket | Official careers page | Feed type |
| --- | --- | --- | --- |
| Apple | FAANG | `https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN` | Official careers HTML search |
| Amazon | FAANG | `https://www.amazon.jobs/en/search?base_query=&loc_query=` | Official careers JSON search |
| Google | FAANG | `https://www.google.com/about/careers/applications/jobs/results?q=intern` | Official careers structured HTML payload |
| Microsoft | FAANG | `https://apply.careers.microsoft.com/careers` | Official careers JSON API |
| Netflix | FAANG | `https://explore.jobs.netflix.net/careers/search?query=intern` | Official careers search payload |
| Nvidia | FAANG | `https://www.nvidia.com/en-us/about-nvidia/careers/` | Workday |
| Adobe | BIG_TECH | `https://careers.adobe.com/us/en/search-results` | Workday |
| AMD | BIG_TECH | `https://careers.amd.com/careers-home/jobs` | Official careers Jibe API |
| Airbnb | BIG_TECH | `https://careers.airbnb.com/positions/` | Greenhouse |
| Akuna Capital | TRADING / QUANT | `https://akunacapital.com/careers` | Greenhouse (`akunacapital`) |
| Atlassian | BIG_TECH | `https://www.atlassian.com/company/careers/all-jobs` | Lever |
| Block | BIG_TECH | `https://block.xyz/careers` | Greenhouse |
| Coinbase | BIG_TECH | `https://www.coinbase.com/careers/positions` | Greenhouse |
| Databricks | BIG_TECH | `https://www.databricks.com/company/careers/open-positions` | Greenhouse |
| Datadog | BIG_TECH | `https://careers.datadoghq.com` | Greenhouse |
| Dropbox | BIG_TECH | `https://jobs.dropbox.com/all-jobs` | Greenhouse |
| Figma | BIG_TECH | `https://www.figma.com/careers` | Greenhouse |
| GitHub | BIG_TECH | `https://www.github.careers/careers-home` | Official careers JSON API |
| HubSpot | BIG_TECH | `https://www.hubspot.com/careers` | Greenhouse |
| IMC | TRADING / QUANT | `https://www.imc.com/us/careers/` | Greenhouse (`imc`) |
| Intel | BIG_TECH | `https://jobs.intel.com/en` | Workday |
| LinkedIn | BIG_TECH | `https://careers.linkedin.com` | Greenhouse |
| Lyft | BIG_TECH | `https://www.lyft.com/careers` | Greenhouse |
| MongoDB | BIG_TECH | `https://www.mongodb.com/careers` | Greenhouse |
| Notion | BIG_TECH | `https://www.notion.so/careers` | Ashby |
| Optiver | TRADING / QUANT | `https://optiver.com/working-at-optiver/early-careers/` | Greenhouse (`optiverus`) |
| Palantir | BIG_TECH | `https://www.palantir.com/careers/` | Lever |
| Pinterest | BIG_TECH | `https://www.pinterestcareers.com/` | Greenhouse |
| Qualcomm | BIG_TECH | `https://careers.qualcomm.com/careers` | Official careers `pcsx` API |
| Reddit | BIG_TECH | `https://redditinc.com/careers` | Greenhouse |
| Robinhood | BIG_TECH | `https://careers.robinhood.com/` | Greenhouse |
| Salesforce | BIG_TECH | `https://careers.salesforce.com/en/jobs/` | Official jobs RSS feed |
| Snap | BIG_TECH | `https://careers.snap.com/jobs` | Workday |
| Snowflake | BIG_TECH | `https://careers.snowflake.com/us/en/search-results` | Ashby |
| Spotify | BIG_TECH | `https://www.lifeatspotify.com/jobs` | Lever |
| Stripe | BIG_TECH | `https://stripe.com/jobs/search` | Greenhouse |
| Cloudflare | BIG_TECH | `https://www.cloudflare.com/careers/jobs/` | Greenhouse |
| Asana | BIG_TECH | `https://asana.com/jobs` | Greenhouse |
| Twilio | BIG_TECH | `https://www.twilio.com/company/jobs` | Greenhouse |
| Vercel | BIG_TECH | `https://vercel.com/careers` | Greenhouse |
| Waymo | BIG_TECH | `https://careers.withwaymo.com/` | Greenhouse |
| Workday | BIG_TECH | `https://workday.wd5.myworkdayjobs.com/Workday` | Workday |
| Zoom | BIG_TECH | `https://careers.zoom.us/home` | Workday |
| Hudson River Trading | TRADING / QUANT | `https://www.hudsonrivertrading.com/careers/` | Greenhouse (`wehrtyou`) |
| Five Rings | TRADING / QUANT | `https://fiverings.com/careers/` | Greenhouse (`fiveringsllc`) |

Current live tracked companies:

- Apple
- Amazon
- Adobe
- AMD
- Airbnb
- Akuna Capital
- Atlassian
- Block
- Coinbase
- Databricks
- Datadog
- Dropbox
- Figma
- GitHub
- Google
- HubSpot
- IMC
- Intel
- LinkedIn
- Lyft
- Microsoft
- MongoDB
- Netflix
- Nvidia
- Notion
- Optiver
- Palantir
- Pinterest
- Qualcomm
- Reddit
- Robinhood
- Salesforce
- Snap
- Snowflake
- Spotify
- Stripe
- Cloudflare
- Asana
- Twilio
- Vercel
- Waymo
- Workday
- Zoom
- Hudson River Trading
- Five Rings

Apple, Google, and Netflix are pulled directly from their official public careers pages. Amazon is pulled from Amazon Jobs' official public `search.json` endpoint, AMD and GitHub use official Jibe careers APIs, Microsoft and Qualcomm use official public `pcsx` careers APIs, Salesforce uses its official jobs RSS feed, Adobe, Intel, Nvidia, Snap, Workday, and Zoom use official public Workday surfaces, Notion and Snowflake use Ashby's public job-board API, Atlassian, Palantir, and Spotify use Lever, and the remaining tracked companies currently use official Greenhouse boards.

The remaining untracked big-tech names are still the ones whose current public careers surfaces are either bot-gated or require more brittle reverse engineering than the MVP should depend on right now: Meta, Tesla, Bloomberg, DoorDash, Oracle, ServiceNow, Shopify, TikTok, and Uber.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Start Postgres:

   ```bash
   docker compose up -d postgres
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Generate Prisma client and apply the migration:

   ```bash
   pnpm db:generate
   pnpm --filter @faang-quant/db migrate:dev
   ```

5. Seed companies, seed sources, and the local admin account:

   ```bash
   pnpm db:seed
   ```

6. Start the web app and worker in separate terminals:

   ```bash
   pnpm dev:web
   pnpm dev:worker
   ```

7. Run one manual ingestion cycle to populate the first live postings immediately:

   ```bash
   pnpm worker:ingest
   ```

## Useful Commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:worker
pnpm build
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm worker:ingest
pnpm worker:digest
```

## Seeded Admin Flow

- the seed script creates an admin user from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
- default local values are in `.env.example`
- verify local login at `/auth/signin`
- admin tools live at `/admin`

## Data Model Highlights

- `Company`
- `CompanySource`
- `InternshipPosting`
- `PostingSourceRecord`
- `SavedSearch`
- `UserFavorite`
- `UserApplicationState`
- `AlertDelivery`
- `IngestionRun`
- `User`
- `VerificationToken`

See [`packages/db/prisma/schema.prisma`](/C:/Users/Kevin/Projects/faang-quant-tracker/packages/db/prisma/schema.prisma) for the full schema.

## Ingestion Notes

- adapters are defined in [`packages/shared/src/adapters`](/C:/Users/Kevin/Projects/faang-quant-tracker/packages/shared/src/adapters)
- the worker normalizes each fetched record into canonical internship fields
- duplicate handling first checks source-record identity, then canonical fingerprint, then fuzzy title/location matching
- source records keep raw payloads for traceability
- stale postings are marked inactive after they fall past the configured last-seen threshold

## Adding Companies and Sources

- edit the seed lists in [`packages/db/src/seed-data.ts`](/C:/Users/Kevin/Projects/faang-quant-tracker/packages/db/src/seed-data.ts)
- rerun `pnpm db:seed`
- or use the admin dashboard to add additional company sources
- rerunning `pnpm db:seed` syncs the database back to the current tracked-source pilot, disables older sample sources that are no longer part of the seeded set, and marks non-pilot postings inactive without deleting their historical records

For new adapter families:

- add a new adapter in `packages/shared/src/adapters`
- register it in `packages/shared/src/adapters/index.ts`
- extend the Prisma `SourceType` enum if needed
- seed or add `CompanySource` rows that reference the new adapter

## Alerts

- mail transport lives in [`packages/email`](/C:/Users/Kevin/Projects/faang-quant-tracker/packages/email)
- `EmailAlertProvider` implements the shared `AlertProvider` interface
- `DiscordWebhookProvider` is stubbed for future expansion
- unsubscribe links disable all future alert emails for the associated user

## Internal APIs / Server Actions

Implemented route handlers:

- `GET /api/internships`
- `GET /api/internships/[slug]`
- `GET /api/companies`
- `GET /api/saved-searches`
- `POST /api/saved-searches`
- `POST /api/favorites`
- `POST /api/application-state`

Implemented server actions include:

- registration and verification-email dispatch
- saved search creation and deletion
- favorite toggling
- application state updates
- settings updates
- unsubscribe handling
- admin ingestion trigger
- company/source toggles
- duplicate merge action

## Testing

The current test suite focuses on shared pure logic:

- internship heuristics
- compensation parsing
- location normalization
- role categorization
- dedupe helpers
- adapter normalization using mocked payloads

Run:

```bash
pnpm test
```

## Environment Variables

Key variables:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_BASE_URL`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `SMTP_URL`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `POLL_CRON`
- `DAILY_DIGEST_CRON`
- `INGESTION_CONCURRENCY`
- `LISTING_NEW_DAYS`
- `POSTING_STALE_DAYS`

See `.env.example` for defaults.
