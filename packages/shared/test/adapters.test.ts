import { describe, expect, it } from "vitest";
import { AshbyAdapter } from "../src/adapters/ashby";
import { CustomApiAdapter } from "../src/adapters/custom-api";
import { CustomHtmlAdapter } from "../src/adapters/custom-html";
import { GreenhouseAdapter } from "../src/adapters/greenhouse";
import { LeverAdapter } from "../src/adapters/lever";

describe("structured adapters", () => {
  it("normalizes greenhouse responses", async () => {
    const adapter = new GreenhouseAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Stripe", slug: "stripe" },
      source: {
        sourceType: "GREENHOUSE",
        sourceName: "Official Greenhouse Board",
        sourceIdentifier: "stripe",
        sourceUrl: "https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true"
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            jobs: [
              {
                id: 123,
                title: "Software Engineer Intern",
                absolute_url: "https://boards.greenhouse.io/stripe/jobs/123",
                updated_at: "2026-04-10T00:00:00.000Z",
                location: { name: "New York, NY" },
                content: "<p>Internship</p>"
              }
            ]
          })
        )
    });

    expect(postings[0]?.externalJobId).toBe("123");
    expect(postings[0]?.locationRaw).toBe("New York, NY");
  });

  it("normalizes lever responses", async () => {
    const adapter = new LeverAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Shopify", slug: "shopify" },
      source: {
        sourceType: "LEVER",
        sourceName: "Official Lever Board",
        sourceIdentifier: "shopify",
        sourceUrl: "https://api.lever.co/v0/postings/shopify?mode=json"
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify([
            {
              id: "abc",
              text: "Backend Intern",
              createdAt: 1712707200000,
              categories: { location: "Remote - United States", commitment: "Intern" },
              applyUrl: "https://jobs.lever.co/shopify/apply",
              hostedUrl: "https://jobs.lever.co/shopify/abc",
              salaryRange: { min: 45, max: 60, currency: "USD", interval: "1 HOUR" }
            }
          ])
        )
    });

    expect(postings[0]?.compensation?.min).toBe(45);
    expect(postings[0]?.remoteTypeHint).toBeUndefined();
  });

  it("normalizes ashby responses", async () => {
    const adapter = new AshbyAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Notion", slug: "notion" },
      source: {
        sourceType: "ASHBY",
        sourceName: "Official Ashby Board",
        sourceIdentifier: "notion",
        sourceUrl: "https://jobs.ashbyhq.com/notion"
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            jobs: [
              {
                id: "job-1",
                title: "Product Manager Intern",
                location: "San Francisco, CA",
                workplaceType: "Hybrid",
                descriptionHtml: "<p>Internship</p>",
                publishedAt: "2026-04-10T00:00:00.000Z",
                applyUrl: "https://jobs.ashbyhq.com/notion/apply",
                compensation: {
                  scrapeableCompensationSalarySummary: "$50 - $60",
                  summaryComponents: [
                    {
                      compensationType: "Salary",
                      interval: "1 HOUR",
                      currencyCode: "USD",
                      minValue: 50,
                      maxValue: 60
                    }
                  ]
                }
              }
            ]
          })
        )
    });

    expect(postings[0]?.compensation?.max).toBe(60);
    expect(postings[0]?.remoteTypeHint).toBe("Hybrid");
  });

  it("normalizes Apple search HTML responses", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Apple", slug: "apple" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Apple internships search",
        sourceIdentifier: "apple-internships",
        sourceUrl: "https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN",
        requestConfigJson: { maxPages: 1 },
        parserConfigJson: { parserId: "apple-search" }
      },
      fetchImpl: async () =>
        new Response(`
          <li>
            <div id="search-search-job-title-200655115-1731-1">
              <div class="job-title-link">
                <h3>
                  <a href="/en-us/details/200655115-1731/software-engineering-intern-machine-learning-ai-workflows?team=STDNT">
                    Software Engineering Intern (Machine Learning &amp; AI Workflows)
                  </a>
                </h3>
                <span class="team-name">Students</span>
                <span class="job-posted-date">Apr 01, 2026</span>
              </div>
              <div id="search-location-search-job-title-200655115-1731-1">
                <span id="search-store-name-container-1">Munich</span>
              </div>
            </div>
          </li>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("200655115-1731");
    expect(postings[0]?.title).toBe("Software Engineering Intern (Machine Learning & AI Workflows)");
    expect(postings[0]?.locationRaw).toBe("Munich");
  });

  it("normalizes Netflix smart apply search HTML responses", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Netflix", slug: "netflix" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Netflix careers search",
        sourceIdentifier: "netflix-intern-search",
        sourceUrl: "https://explore.jobs.netflix.net/careers/search?query=intern",
        parserConfigJson: { parserId: "netflix-smartapply-search" }
      },
      fetchImpl: async () =>
        new Response(`
          <code id="smartApplyData">
            {&#34;query&#34;:{&#34;query&#34;:&#34;intern&#34;},&#34;positions&#34;:[{&#34;id&#34;:790313241540,&#34;name&#34;:&#34;Software Engineer PhD Intern, Streaming Algorithms (Summer 2026)&#34;,&#34;posting_name&#34;:&#34;Software Engineer PhD Intern, Streaming Algorithms (Summer 2026)&#34;,&#34;location&#34;:&#34;Los Gatos,California,United States of America&#34;,&#34;locations&#34;:[&#34;Los Gatos,California,United States of America&#34;],&#34;t_create&#34;:1765324800,&#34;ats_job_id&#34;:&#34;JR37687&#34;,&#34;work_location_option&#34;:&#34;onsite&#34;,&#34;department&#34;:&#34;Engineering&#34;,&#34;business_unit&#34;:&#34;Streaming&#34;,&#34;locale&#34;:&#34;en-US&#34;,&#34;canonicalPositionUrl&#34;:&#34;https://explore.jobs.netflix.net/careers/job/790313241540&#34;}]}
          </code>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("JR37687");
    expect(postings[0]?.applicationUrl).toBe(
      "https://explore.jobs.netflix.net/careers/job/790313241540"
    );
    expect(postings[0]?.title).toContain("Intern");
  });

  it("normalizes Amazon official search JSON responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Amazon", slug: "amazon" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Amazon internships search",
        sourceIdentifier: "amazon-search",
        sourceUrl:
          "https://www.amazon.jobs/en/search.json?base_query=&loc_query=&sort=recent&is_intern[]=1",
        requestConfigJson: { pageSize: 100, maxPages: 1 },
        parserConfigJson: { parserId: "amazon-search-json" }
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            hits: 1,
            jobs: [
              {
                id: "bc566844-1ba8-42e4-9459-29984f843e02",
                id_icims: "10390972",
                title: "UX Researcher Intern",
                posted_date: "April 14, 2026",
                updated_time: "about 2 hours",
                job_path: "/en/jobs/10390972/ux-researcher-intern",
                url_next_step: "https://account.amazon.com/jobs/10390972/apply",
                description: "Amazon internships are full-time (38 hours/week).",
                description_short: "Amazon internships are full-time.",
                basic_qualifications: "- Currently working towards a Master's Degree",
                preferred_qualifications: "- Excellent communication skills",
                location: "ES, M, Madrid",
                normalized_location: "Madrid, Community of Madrid, Spain",
                locations: [
                  "{\"normalizedStateName\":\"Community of Madrid\",\"normalizedCountryName\":\"Spain\",\"normalizedCountryCode\":\"ESP\",\"city\":\"Madrid\",\"type\":\"ONSITE\",\"normalizedLocation\":\"Madrid, Community of Madrid, Spain\"}",
                  "{\"normalizedStateName\":\"Catalonia\",\"normalizedCountryName\":\"Spain\",\"normalizedCountryCode\":\"ESP\",\"city\":\"Barcelona\",\"type\":\"ONSITE\",\"normalizedLocation\":\"Barcelona, Catalonia, Spain\"}"
                ],
                company_name: "Amazon Spain Services, S.L.U.",
                business_category: "studentprograms",
                job_category: "Design",
                job_family: "Design",
                job_schedule_type: "full-time",
                primary_search_label: "studentprograms.team-internships-for-students",
                optional_search_labels: [],
                source_system: "JobCreator",
                university_job: true,
                team: {
                  label: "team-internships-for-students"
                }
              }
            ]
          })
        )
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("10390972");
    expect(postings[0]?.title).toBe("UX Researcher Intern");
    expect(postings[0]?.sourceUrl).toBe("https://www.amazon.jobs/en/jobs/10390972/ux-researcher-intern");
    expect(postings[0]?.applicationUrl).toBe("https://account.amazon.com/jobs/10390972/apply");
    expect(postings[0]?.locationRaw).toBe("Madrid, Community of Madrid, Spain");
    expect(postings[0]?.additionalLocations).toEqual(["Barcelona, Catalonia, Spain"]);
    expect(postings[0]?.remoteTypeHint).toBe("ONSITE");
  });
});
