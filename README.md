# Internship Quant Tracker

Production-minded internship tracker focused on:

- FAANG, mega-cap tech, developer tools, infrastructure, and high-growth software companies
- Quant, trading, market making, hedge fund, and prop trading firms

The project prefers official structured ATS-backed public job data over brittle scraping. The initial ingestion adapters target Greenhouse, Lever, and Ashby.

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

Current priority target companies for expansion:

- FAANG / mega-cap tech: Apple, Amazon, Google, Meta, Microsoft, Netflix, Nvidia, Tesla
- Quant / trading: Jane Street, Hudson River Trading, Five Rings, Optiver, IMC, Citadel Securities, Jump Trading, Two Sigma

## Currently Tracked Companies

The seeded tracked set is still intentionally curated, but it now includes both ATS-backed sources and direct official careers pages where the company exposes usable public listing data.

| Company | Bucket | Official careers page | Feed type |
| --- | --- | --- | --- |
| Apple | FAANG | `https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN` | Official careers HTML search |
| Amazon | FAANG | `https://www.amazon.jobs/en/search?base_query=&loc_query=` | Official careers JSON search |
| Netflix | FAANG | `https://explore.jobs.netflix.net/careers/search?query=intern` | Official careers search payload |
| Stripe | BIG_TECH | `https://stripe.com/jobs/search` | Greenhouse |
| Cloudflare | BIG_TECH | `https://www.cloudflare.com/careers/jobs/` | Greenhouse |
| Asana | BIG_TECH | `https://asana.com/jobs` | Greenhouse |
| Hudson River Trading | TRADING / QUANT | `https://www.hudsonrivertrading.com/careers/` | Greenhouse (`wehrtyou`) |
| Five Rings | TRADING / QUANT | `https://fiverings.com/careers/` | Greenhouse (`fiveringsllc`) |

Current live tracked companies:

- Apple
- Amazon
- Netflix
- Stripe
- Cloudflare
- Asana
- Hudson River Trading
- Five Rings

Apple and Netflix are pulled directly from their official public careers pages. Amazon is pulled from Amazon Jobs' official public `search.json` endpoint, and the others currently use official Greenhouse boards.

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
