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

## Target Company Coverage

Single source of truth for the seeded target universe. `Tracked` means `db:seed` currently creates an active `CompanySource` for that company; `Not yet tracked` means the company is in the target universe but still needs a reliable public feed or adapter.

| Company | Bucket | Status | Careers page | Feed type | Notes |
| --- | --- | --- | --- | --- | --- |
| Adobe | Big Tech | Tracked | [Careers](https://careers.adobe.com/us/en/search-results) | Workday (adobe-external-experienced) | Polling enabled; priority 8; Official Adobe careers via Workday |
| Affirm | Big Tech | Tracked | [Careers](https://www.affirm.com/careers/) | Greenhouse (affirm) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Airbnb | Big Tech | Tracked | [Careers](https://careers.airbnb.com/positions/) | Greenhouse (airbnb) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Akuna Capital | Trading | Tracked | [Careers](https://akunacapital.com/careers) | Greenhouse (akunacapital) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Amazon | FAANG | Tracked | [Careers](https://www.amazon.jobs) | Custom API (amazon-search) | Polling enabled; priority 6; Official Amazon internships search |
| AMD | Big Tech | Tracked | [Careers](https://careers.amd.com/careers-home/jobs) | Custom API (amd-jibe) | Polling enabled; priority 7; Official AMD careers API |
| Anduril | Big Tech | Tracked | [Careers](https://www.anduril.com/careers) | Greenhouse (andurilindustries) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Anthropic | Big Tech | Tracked | [Careers](https://www.anthropic.com/careers) | Greenhouse (anthropic) | Polling enabled; priority 8; Official careers site via Greenhouse |
| Apple | FAANG | Tracked | [Careers](https://jobs.apple.com) | Custom HTML (apple-internships) | Polling enabled; priority 5; Official Apple internships search |
| AQR | Hedge Fund | Tracked | [Careers](https://www.aqr.com/About-Us/Careers) | Greenhouse (aqr) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Aquatic Capital Management | Hedge Fund | Tracked | [Careers](https://www.aquatic.com/careers) | Greenhouse (aquaticcapitalmanagement) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Arm | Big Tech | Tracked | [Careers](https://careers.arm.com/search-jobs) | Custom HTML (arm-talentbrew-intern) | Polling enabled; priority 7; Official Arm careers search |
| Asana | Big Tech | Tracked | [Careers](https://asana.com/jobs) | Greenhouse (asana) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Astranis | Big Tech | Tracked | [Careers](https://www.astranis.com/careers) | Greenhouse (astranis) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Atlassian | Big Tech | Tracked | [Careers](https://www.atlassian.com/company/careers/all-jobs) | Lever (atlassian) | Polling enabled; priority 9; Official careers site via Lever |
| Aurora | Big Tech | Tracked | [Careers](https://aurora.tech/careers/) | Greenhouse (aurorainnovation) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Belvedere Trading | Trading | Tracked | [Careers](https://www.belvederetrading.com/our-positions) | Lever (belvederetrading) | Polling enabled; priority 9; Official careers site via Lever |
| Block | Big Tech | Tracked | [Careers](https://block.xyz/careers) | Greenhouse (block) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Bloomberg | Big Tech | Tracked | [Careers](https://www.bloomberg.com/company/careers) | Custom HTML (bloomberg-avature) | Polling enabled; priority 7; Official Bloomberg careers search |
| BlueCrest Capital Management | Hedge Fund | Tracked | [Careers](https://www.bluecrestcapital.com/careers/) | Greenhouse (bluecrestcapitalmanagement) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Box | Big Tech | Tracked | [Careers](https://careers.box.com/en/) | Greenhouse (boxinc) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Brex | Big Tech | Tracked | [Careers](https://www.brex.com/careers/) | Greenhouse (brex) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Broadcom | Big Tech | Tracked | [Careers](https://www.broadcom.com/company/careers) | Workday (broadcom-external-career) | Polling enabled; priority 8; Official Broadcom careers via Workday |
| Capital Fund Management | Hedge Fund | Tracked | [Careers](https://www.cfm.com/join-us-cfm-careers/) | Greenhouse (cfm) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Chime | Big Tech | Tracked | [Careers](https://careers.chime.com/jobs/) | Greenhouse (chime) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Cisco | Big Tech | Tracked | [Careers](https://careers.cisco.com/global/en/) | Custom API (cisco-phenom) | Polling enabled; priority 7; Official Cisco careers via Phenom |
| Citadel | Hedge Fund | Not yet tracked | [Careers](https://www.citadel.com/careers/open-opportunities/) | TBD | Official open-opportunities page and WordPress API are Cloudflare-gated for worker-style requests |
| Citadel Securities | Quant | Not yet tracked | [Careers](https://www.citadelsecurities.com/careers/open-opportunities/) | TBD | Official open-opportunities page and WordPress API are Cloudflare-gated for worker-style requests |
| Cloudflare | Big Tech | Tracked | [Careers](https://www.cloudflare.com/careers/jobs/) | Greenhouse (cloudflare) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Cockroach Labs | Big Tech | Tracked | [Careers](https://www.cockroachlabs.com/careers) | Greenhouse (cockroachlabs) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Coinbase | Big Tech | Tracked | [Careers](https://www.coinbase.com/careers/positions) | Greenhouse (coinbase) | Polling enabled; priority 10; Official careers site via Greenhouse |
| CoreWeave | Big Tech | Tracked | [Careers](https://www.coreweave.com/careers) | Greenhouse (coreweave) | Polling enabled; priority 10; Official careers site via Greenhouse |
| CrowdStrike | Big Tech | Tracked | [Careers](https://www.crowdstrike.com/en-us/careers/) | Workday (crowdstrike-workday) | Polling enabled; priority 8; Official CrowdStrike careers via Workday |
| CTC | Trading | Tracked | [Careers](https://www.ctccapital.com/careers) | Greenhouse (chicagotrading) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Cursor | Big Tech | Tracked | [Careers](https://cursor.com/careers) | Ashby (cursor) | Polling enabled; priority 8; Official careers site via Ashby |
| Databricks | Big Tech | Tracked | [Careers](https://www.databricks.com/company/careers/open-positions) | Greenhouse (databricks) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Datadog | Big Tech | Tracked | [Careers](https://careers.datadoghq.com) | Greenhouse (datadog) | Polling enabled; priority 10; Official careers site via Greenhouse |
| DE Shaw | Hedge Fund | Tracked | [Careers](https://www.deshaw.com/careers) | Custom HTML (deshaw-careers) | Polling enabled; priority 7; Official D. E. Shaw careers page |
| Dell Technologies | Big Tech | Tracked | [Careers](https://jobs.dell.com/) | Custom API (dell-oracle-hcm) | Polling enabled; priority 7; Official Dell careers via Oracle HCM |
| Discord | Big Tech | Tracked | [Careers](https://discord.com/careers) | Greenhouse (discord) | Polling enabled; priority 10; Official careers site via Greenhouse |
| DoorDash | Big Tech | Tracked | [Careers](https://careers.doordash.com) | Greenhouse (doordashusa) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Dropbox | Big Tech | Tracked | [Careers](https://jobs.dropbox.com/all-jobs) | Greenhouse (dropbox) | Polling enabled; priority 10; Official careers site via Greenhouse |
| DRW | Trading | Tracked | [Careers](https://www.drw.com/work-at-drw/listings) | Custom HTML (drw-listings) | Polling enabled; priority 6; Official DRW careers listings |
| Duolingo | Big Tech | Tracked | [Careers](https://careers.duolingo.com/) | Greenhouse (duolingo) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Elastic | Big Tech | Tracked | [Careers](https://www.elastic.co/careers) | Greenhouse (elastic) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Engineers Gate | Hedge Fund | Tracked | [Careers](https://www.engineersgate.com/careers) | Greenhouse (engineersgate) | Polling enabled; priority 10; Official careers site via Greenhouse |
| ExodusPoint | Hedge Fund | Tracked | [Careers](https://www.exoduspoint.com/careers) | Greenhouse (exoduspoint) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Figma | Big Tech | Tracked | [Careers](https://www.figma.com/careers) | Greenhouse (figma) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Five Rings | Trading | Tracked | [Careers](https://fiverings.com/careers/) | Greenhouse (fiveringsllc) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Fivetran | Big Tech | Tracked | [Careers](https://www.fivetran.com/careers) | Greenhouse (fivetran) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Flow Traders | Trading | Tracked | [Careers](https://www.flowtraders.com/careers/) | Greenhouse (flowtraders) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Geneva Trading | Trading | Tracked | [Careers](https://www.genevatrading.com/career-in-trading/) | Greenhouse (genevatrading) | Polling enabled; priority 10; Official careers site via Greenhouse |
| GitHub | Big Tech | Tracked | [Careers](https://www.github.careers/careers-home) | Custom API (github-jibe) | Polling enabled; priority 7; Official GitHub careers API |
| GitLab | Big Tech | Tracked | [Careers](https://about.gitlab.com/jobs/all-jobs/) | Greenhouse (gitlab) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Google | FAANG | Tracked | [Careers](https://www.google.com/about/careers/applications) | Custom HTML (google-careers-intern) | Polling enabled; priority 6; Official Google careers internships search |
| Graham Capital Management | Hedge Fund | Tracked | [Careers](https://www.grahamcapital.com/careers/) | Greenhouse (grahamcapitalmanagement) | Polling enabled; priority 10; Official careers site via Greenhouse |
| G-Research | Hedge Fund | Tracked | [Careers](https://www.gresearch.com/vacancies/) | Custom HTML (gresearch-vacancies) | Polling enabled; priority 7; Official G-Research vacancies page |
| GSA Capital | Trading | Tracked | [Careers](https://www.gsacapital.com/join-us) | Greenhouse (gsacapital) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Hewlett Packard Enterprise | Big Tech | Tracked | [Careers](https://careers.hpe.com/us/en/home) | Custom API (hpe-phenom) | Polling enabled; priority 7; Official HPE careers via Phenom |
| HubSpot | Big Tech | Tracked | [Careers](https://www.hubspot.com/careers) | Greenhouse (hubspot) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Hudson River Trading | Trading | Tracked | [Careers](https://www.hudsonrivertrading.com/careers/) | Greenhouse (wehrtyou) | Polling enabled; priority 10; Official careers site via Greenhouse |
| IBM | Big Tech | Tracked | [Careers](https://www.ibm.com/careers/search) | Custom API (ibm-careers-search) | Polling enabled; priority 7; Official IBM careers search |
| IMC | Trading | Tracked | [Careers](https://www.imc.com/us/careers/) | Greenhouse (imc) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Instacart | Big Tech | Tracked | [Careers](https://www.instacart.careers/) | Greenhouse (instacart) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Intel | Big Tech | Tracked | [Careers](https://jobs.intel.com/en) | Workday (intel-external) | Polling enabled; priority 8; Official Intel careers via Workday |
| Jane Street | Trading | Tracked | [Careers](https://www.janestreet.com/join-jane-street/open-roles/) | Greenhouse (janestreet) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Jump Trading | Trading | Tracked | [Careers](https://www.jumptrading.com/hr/students-new-grads) | Greenhouse (jumptrading) | Polling enabled; priority 10; Official careers site via Greenhouse |
| LaunchDarkly | Big Tech | Tracked | [Careers](https://launchdarkly.com/careers/) | Greenhouse (launchdarkly) | Polling enabled; priority 10; Official careers site via Greenhouse |
| LinkedIn | Big Tech | Tracked | [Careers](https://careers.linkedin.com) | Greenhouse (linkedin) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Lyft | Big Tech | Tracked | [Careers](https://www.lyft.com/careers) | Greenhouse (lyft) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Man Group | Hedge Fund | Tracked | [Careers](https://www.man.com/careers) | Greenhouse (mangroup) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Marshall Wace | Hedge Fund | Tracked | [Careers](https://www.mwam.com/join-us/) | Greenhouse (marshallwace) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Marvell | Big Tech | Tracked | [Careers](https://www.marvell.com/company/careers.html) | Workday (marvell-workday) | Polling enabled; priority 8; Official Marvell careers via Workday |
| Maven Securities | Trading | Tracked | [Careers](https://www.mavensecurities.com/jobs/) | Greenhouse (mavensecuritiesholdingltd) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Meta | FAANG | Tracked | [Careers](https://www.metacareers.com) | Custom API (meta-careers-intern) | Polling enabled; priority 7; Official Meta careers search |
| Micron | Big Tech | Tracked | [Careers](https://www.micron.com/about/careers) | Custom API (micron-pcsx) | Polling enabled; priority 7; Official Micron careers via PCSX |
| Microsoft | FAANG | Tracked | [Careers](https://jobs.careers.microsoft.com) | Custom API (microsoft-pcsx) | Polling enabled; priority 7; Official Microsoft careers internships search |
| Millennium | Hedge Fund | Tracked | [Careers](https://career.mlp.com/careers) | Custom API (millennium-eightfold) | Polling enabled; priority 7; Official Millennium careers API via Eightfold |
| MongoDB | Big Tech | Tracked | [Careers](https://www.mongodb.com/careers) | Greenhouse (mongodb) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Netflix | FAANG | Tracked | [Careers](https://jobs.netflix.com) | Custom HTML (netflix-intern-search) | Polling enabled; priority 8; Official Netflix internship search |
| Neuralink | Big Tech | Tracked | [Careers](https://neuralink.com/careers/) | Greenhouse (neuralink) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Notion | Big Tech | Tracked | [Careers](https://www.notion.so/careers) | Ashby (notion) | Polling enabled; priority 9; Official careers site via Ashby |
| Nuro | Big Tech | Tracked | [Careers](https://www.nuro.ai/careers) | Greenhouse (nuro) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Nvidia | FAANG | Tracked | [Careers](https://www.nvidia.com/en-us/about-nvidia/careers) | Workday (nvidia-external-careers) | Polling enabled; priority 8; Official Nvidia careers via Workday |
| Okta | Big Tech | Tracked | [Careers](https://www.okta.com/company/careers/) | Greenhouse (okta) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Old Mission | Trading | Tracked | [Careers](https://www.oldmissioncapital.com/careers/) | Greenhouse (oldmissioncapital) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Optiver | Trading | Tracked | [Careers](https://optiver.com/working-at-optiver/early-careers/) | Greenhouse (optiverus) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Oracle | Big Tech | Tracked | [Careers](https://careers.oracle.com) | Custom API (oracle-hcm-jobsearch) | Polling enabled; priority 7; Official Oracle careers search |
| Palantir | Big Tech | Tracked | [Careers](https://www.palantir.com/careers/) | Lever (palantir) | Polling enabled; priority 9; Official careers site via Lever |
| Palo Alto Networks | Big Tech | Tracked | [Careers](https://jobs.paloaltonetworks.com/en) | Workday (palo-alto-networks-workday) | Polling enabled; priority 8; Official Palo Alto Networks careers via Workday |
| PDT Partners | Hedge Fund | Tracked | [Careers](https://www.pdtpartners.com/careers/) | Greenhouse (pdtpartners) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Perplexity | Big Tech | Tracked | [Careers](https://www.perplexity.ai/hub/careers) | Ashby (perplexity) | Polling enabled; priority 8; Official careers site via Ashby |
| Pinterest | Big Tech | Tracked | [Careers](https://www.pinterestcareers.com/) | Greenhouse (pinterest) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Point72 | Hedge Fund | Tracked | [Careers](https://careers.point72.com/) | Greenhouse (point72) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Quadrature Capital | Trading | Tracked | [Careers](https://www.quadrature.ai/careers/join-us/) | Greenhouse (quadraturecapital) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Qualcomm | Big Tech | Tracked | [Careers](https://careers.qualcomm.com/careers) | Custom API (qualcomm-pcsx) | Polling enabled; priority 7; Official Qualcomm careers search |
| Qube Research & Technologies | Hedge Fund | Tracked | [Careers](https://www.qube-rt.com/careers/) | Greenhouse (quberesearchandtechnologies) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Ramp | Big Tech | Tracked | [Careers](https://ramp.com/careers) | Ashby (ramp) | Polling enabled; priority 8; Official careers site via Ashby |
| Reddit | Big Tech | Tracked | [Careers](https://redditinc.com/careers) | Greenhouse (reddit) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Robinhood | Big Tech | Tracked | [Careers](https://careers.robinhood.com/) | Greenhouse (robinhood) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Roblox | Big Tech | Tracked | [Careers](https://careers.roblox.com/) | Greenhouse (roblox) | Polling enabled; priority 8; Official careers site via Greenhouse |
| Rubrik | Big Tech | Tracked | [Careers](https://www.rubrik.com/company/careers) | Greenhouse (rubrik) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Salesforce | Big Tech | Tracked | [Careers](https://careers.salesforce.com/en/jobs/) | Custom API (salesforce-rss) | Polling enabled; priority 6; Official Salesforce jobs RSS |
| Samsara | Big Tech | Tracked | [Careers](https://www.samsara.com/careers) | Greenhouse (samsara) | Polling enabled; priority 10; Official careers site via Greenhouse |
| SAP | Big Tech | Tracked | [Careers](https://jobs.sap.com/) | Custom API (sap-rss-internship) | Polling enabled; priority 7; Official SAP jobs RSS |
| Scale AI | Big Tech | Tracked | [Careers](https://scale.com/careers) | Greenhouse (scaleai) | Polling enabled; priority 8; Official careers site via Greenhouse |
| Schonfeld | Hedge Fund | Tracked | [Careers](https://www.schonfeld.com/careers/) | Greenhouse (schonfeld) | Polling enabled; priority 10; Official careers site via Greenhouse |
| ServiceNow | Big Tech | Tracked | [Careers](https://careers.servicenow.com) | Custom API (servicenow-smartrecruiters) | Polling enabled; priority 7; Official ServiceNow careers API |
| Shopify | Big Tech | Tracked | [Careers](https://www.shopify.com/careers) | Custom HTML (shopify-careers) | Polling enabled; priority 7; Official Shopify careers page |
| SIG | Trading | Tracked | [Careers](https://careers.sig.com/jobs) | Custom API (sig-jibe) | Polling enabled; priority 7; Official SIG careers API via iCIMS/Jibe |
| Slack | Big Tech | Tracked | [Careers](https://slack.com/careers) | Workday (salesforce-slack-workday) | Polling enabled; priority 8; Official Slack careers via Salesforce Workday |
| Snap | Big Tech | Tracked | [Careers](https://careers.snap.com/jobs) | Workday (snap-workday) | Polling enabled; priority 8; Official Snap careers via Workday |
| Snowflake | Big Tech | Tracked | [Careers](https://careers.snowflake.com) | Ashby (snowflake) | Polling enabled; priority 9; Official careers site via Ashby |
| Splunk | Big Tech | Tracked | [Careers](https://careers.cisco.com/global/en/splunk) | Custom API (cisco-phenom-splunk) | Polling enabled; priority 7; Official Splunk careers via Cisco Phenom |
| Spotify | Big Tech | Tracked | [Careers](https://www.lifeatspotify.com/jobs) | Lever (spotify) | Polling enabled; priority 9; Official careers site via Lever |
| Square | Big Tech | Tracked | [Careers](https://block.xyz/careers/jobs?businessUnits[]=square) | Greenhouse (block-square) | Polling enabled; priority 10; Official Square careers via Block Greenhouse |
| Squarepoint Capital | Hedge Fund | Tracked | [Careers](https://www.squarepoint-capital.com/open-opportunities) | Greenhouse (squarepointcapital) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Stripe | Big Tech | Tracked | [Careers](https://stripe.com/jobs) | Greenhouse (stripe) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Susquehanna | Trading | Tracked | [Careers](https://careers.sig.com/jobs) | Custom API (susquehanna-jibe) | Polling enabled; priority 7; Official Susquehanna careers API via iCIMS/Jibe |
| Tesla | FAANG | Not yet tracked | [Careers](https://www.tesla.com/careers) | TBD | Official careers page and careers API return Akamai 403 to worker-style requests |
| Texas Instruments | Big Tech | Tracked | [Careers](https://careers.ti.com/en/sites/CX) | Custom API (texas-instruments-oracle-hcm) | Polling enabled; priority 7; Official Texas Instruments careers via Oracle HCM |
| The Voleon Group | Hedge Fund | Tracked | [Careers](https://voleon.com/jobs/) | Ashby (voleon) | Polling enabled; priority 8; Official careers site via Ashby |
| TikTok | Big Tech | Tracked | [Careers](https://lifeattiktok.com) | Custom API (tiktok-life-at-tiktok) | Polling enabled; priority 7; Official Life at TikTok careers API |
| Toast | Big Tech | Tracked | [Careers](https://careers.toasttab.com/) | Greenhouse (toast) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Tower Research Capital | Trading | Tracked | [Careers](https://www.tower-research.com/open-positions/) | Greenhouse (towerresearchcapital) | Polling enabled; priority 10; Official careers site via Greenhouse |
| TransMarket Group | Trading | Tracked | [Careers](https://www.transmarketgroup.com/careers) | Greenhouse (transmarketgroup) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Twilio | Big Tech | Tracked | [Careers](https://www.twilio.com/company/jobs) | Greenhouse (twilio) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Two Sigma | Hedge Fund | Tracked | [Careers](https://careers.twosigma.com/) | Custom HTML (two-sigma-avature) | Polling enabled; priority 6; Official Two Sigma careers page |
| Uber | Big Tech | Tracked | [Careers](https://www.uber.com/us/en/careers) | Custom API (uber-careers-search) | Polling enabled; priority 7; Official Uber careers search |
| Unity | Big Tech | Tracked | [Careers](https://unity.com/careers) | Greenhouse (unity3d) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Valkyrie Trading | Trading | Tracked | [Careers](https://www.valkyrietrading.com/careers) | Lever (valkyrietrading) | Polling enabled; priority 9; Official careers site via Lever |
| Vatic Labs | Trading | Tracked | [Careers](https://www.vaticlabs.ai/careers/) | Greenhouse (vaticlabs) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Vercel | Big Tech | Tracked | [Careers](https://vercel.com/careers) | Greenhouse (vercel) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Verkada | Big Tech | Tracked | [Careers](https://www.verkada.com/careers/) | Greenhouse (verkada) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Virtu Financial | Trading | Tracked | [Careers](https://www.virtu.com/careers/) | Greenhouse (virtu) | Polling enabled; priority 10; Official careers site via Greenhouse |
| VMware | Big Tech | Tracked | [Careers](https://www.broadcom.com/company/careers) | Workday (broadcom-external-career) | Polling enabled; priority 8; Official Broadcom careers via Workday |
| Waymo | Big Tech | Tracked | [Careers](https://careers.withwaymo.com/) | Greenhouse (waymo) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Winton | Hedge Fund | Tracked | [Careers](https://www.winton.com/opportunities) | Greenhouse (winton) | Polling enabled; priority 10; Official careers site via Greenhouse |
| Wolverine Trading | Trading | Tracked | [Careers](https://www.wolve.com/careers/) | Lever (wolve) | Polling enabled; priority 9; Official careers site via Lever |
| Workday | Big Tech | Tracked | [Careers](https://workday.wd5.myworkdayjobs.com/Workday) | Workday (workday-company-careers) | Polling enabled; priority 8; Official Workday careers via Workday |
| WorldQuant | Hedge Fund | Tracked | [Careers](https://www.worldquant.com/career-listing/) | Greenhouse (worldquant) | Polling enabled; priority 10; Official careers site via Greenhouse |
| XR Trading | Trading | Tracked | [Careers](https://recruiting.paylocity.com/recruiting/jobs/All/5c109104-7c4d-415c-9ee4-54e3af55f9e7/XR-Trading-LLC) | Custom HTML (xr-trading-paylocity) | Polling enabled; priority 6; Official XR Trading careers page via Paylocity |
| Yahoo | Big Tech | Tracked | [Careers](https://www.yahooinc.com/careers/) | Workday (ouryahoo-careers) | Polling enabled; priority 8; Official Yahoo careers via Workday |
| Yelp | Big Tech | Tracked | [Careers](https://www.yelp.careers/us/en) | Custom API (yelp-phenom) | Polling enabled; priority 7; Official Yelp careers API via Phenom |
| Zoom | Big Tech | Tracked | [Careers](https://careers.zoom.us/home) | Workday (zoom-workday) | Polling enabled; priority 8; Official Zoom careers via Workday |
| Zscaler | Big Tech | Tracked | [Careers](https://www.zscaler.com/careers) | Greenhouse (zscaler) | Polling enabled; priority 10; Official careers site via Greenhouse |

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

## Supabase Cloud Database

Supabase can host the PostgreSQL database used by Prisma, NextAuth, the web app, and the ingestion
worker. The existing credentials auth remains in place; user accounts, password hashes,
verification tokens, saved searches, posting lists, and application state are all stored in the
cloud database. Supabase Auth and browser-side database access are intentionally not enabled.

1. Create a [Supabase project](https://supabase.com/dashboard) and open its **Connect** dialog.
2. Copy `.env.supabase.example` into the deployment's secret/environment-variable configuration.
3. Set `DATABASE_URL` to the pooled runtime URL:
   - serverless deployments: Supavisor transaction pooler on port `6543`, with
     `pgbouncer=true&connection_limit=1`
   - persistent web/worker servers: direct connection or Supavisor session pooler on port `5432`
4. Set `DIRECT_URL` to the direct connection, or the Supavisor session pooler on port `5432` when
   the machine is IPv4-only. Prisma migrations and database-copy tools use this URL.
5. Set production `NEXTAUTH_URL`, `APP_BASE_URL`, `NEXTAUTH_SECRET`, and email-provider secrets.

For a fresh cloud database with no local data to preserve:

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:check
```

To copy the current local database, run the guarded copy command against a fresh Supabase project.
It uses locally installed PostgreSQL client tools when available and otherwise runs them through
the `postgres:16` Docker image:

```powershell
$env:LOCAL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/faang_quant_tracker"
$env:DIRECT_URL="the Supabase direct or session-pooler URL"
pnpm db:cloud:copy
```

On macOS or Linux, export the same two variables before running `pnpm db:cloud:copy`.

The copy command refuses to run when the destination already contains public tables. It applies
the committed Prisma migrations first, then copies all application data, including users and
postings. After copying, set the deployment's pooled `DATABASE_URL` and run `pnpm db:check`.

See the official [Supabase Prisma guide](https://supabase.com/docs/guides/database/prisma) and
[database connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) for
connection-string details. Keep both database URLs server-only.

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
pnpm db:check
pnpm db:cloud:copy
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
- `DIRECT_URL`
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

`EMAIL_PROVIDER=console` is intended for local development and logs email content to the web
server instead of delivering it. Account registration shows a local verification button in this
mode. Configure `EMAIL_PROVIDER=resend` with `RESEND_API_KEY`, or `EMAIL_PROVIDER=smtp` with
`SMTP_URL`, to deliver verification emails to real inboxes.
