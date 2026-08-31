import { describe, expect, it } from "vitest";
import { AshbyAdapter } from "../src/adapters/ashby";
import { FetchTimeoutError, fetchJson, mapWithConcurrency } from "../src/adapters/base";
import { CustomApiAdapter } from "../src/adapters/custom-api";
import { CustomHtmlAdapter } from "../src/adapters/custom-html";
import { GreenhouseAdapter } from "../src/adapters/greenhouse";
import { LeverAdapter } from "../src/adapters/lever";
import { WorkdayAdapter } from "../src/adapters/workday";

describe("structured adapters", () => {
  it("clamps detail concurrency and preserves mapper output order", async () => {
    let active = 0;
    let peakActive = 0;

    const result = await mapWithConcurrency(
      Array.from({ length: 12 }, (_, index) => index),
      99,
      async (value) => {
        active += 1;
        peakActive = Math.max(peakActive, active);
        await new Promise((resolve) => setTimeout(resolve, value === 0 ? 20 : 0));
        active -= 1;
        return value * 2;
      }
    );

    expect(peakActive).toBe(10);
    expect(result).toEqual(Array.from({ length: 12 }, (_, index) => index * 2));
  });

  it("uses a safe default for invalid concurrency limits", async () => {
    let active = 0;
    let peakActive = 0;

    await mapWithConcurrency(
      Array.from({ length: 7 }, (_, index) => index),
      0,
      async (value) => {
        active += 1;
        peakActive = Math.max(peakActive, active);
        await new Promise((resolve) => setTimeout(resolve, value === 0 ? 10 : 0));
        active -= 1;
        return value;
      }
    );

    expect(peakActive).toBe(5);
  });

  it("aborts adapter requests after the configured timeout", async () => {
    let receivedSignal: AbortSignal | undefined;

    await expect(
      fetchJson(
        {
          company: { name: "Example", slug: "example" },
          source: {
            sourceType: "CUSTOM_API",
            sourceName: "Example API",
            sourceIdentifier: "example",
            sourceUrl: "https://example.com/jobs"
          },
          requestTimeoutMs: 5,
          fetchImpl: async (_url, init) =>
            new Promise<Response>((_resolve, reject) => {
              receivedSignal = init?.signal as AbortSignal | undefined;
              receivedSignal?.addEventListener(
                "abort",
                () => reject(receivedSignal?.reason ?? new Error("aborted")),
                { once: true }
              );
            })
        },
        "https://example.com/jobs"
      )
    ).rejects.toBeInstanceOf(FetchTimeoutError);

    expect(receivedSignal?.aborted).toBe(true);
  });

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

  it("normalizes greenhouse structured compensation metadata", async () => {
    const adapter = new GreenhouseAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "MongoDB", slug: "mongodb" },
      source: {
        sourceType: "GREENHOUSE",
        sourceName: "Official Greenhouse Board",
        sourceIdentifier: "mongodb",
        sourceUrl: "https://boards-api.greenhouse.io/v1/boards/mongodb/jobs?content=true"
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            jobs: [
              {
                id: 456,
                title: "Program Management Intern",
                absolute_url: "https://www.mongodb.com/careers/job/?gh_jid=456",
                updated_at: "2026-04-14T00:00:00.000Z",
                location: { name: "New York, NY" },
                metadata: [
                  {
                    name: "Baseline Budgeted Salary",
                    value: {
                      unit: "USD",
                      min_value: "70200.0",
                      max_value: "70200.0"
                    }
                  }
                ]
              }
            ]
          })
        )
    });

    expect(postings[0]?.payRaw).toBe("USD 70,200");
    expect(postings[0]?.compensation?.min).toBe(70200);
    expect(postings[0]?.compensation?.max).toBe(70200);
    expect(postings[0]?.compensation?.currency).toBe("USD");
  });

  it("filters greenhouse responses by configured metadata fields", async () => {
    const adapter = new GreenhouseAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Square", slug: "square" },
      source: {
        sourceType: "GREENHOUSE",
        sourceName: "Official Square careers via Block Greenhouse",
        sourceIdentifier: "block-square",
        sourceUrl: "https://boards-api.greenhouse.io/v1/boards/block/jobs?content=true",
        requestConfigJson: {
          metadataFieldFilters: { "Business Unit": ["Square"] }
        }
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            jobs: [
              {
                id: 111,
                title: "Square Software Engineer Intern",
                absolute_url: "https://block.xyz/careers/jobs/111",
                metadata: [{ name: "Business Unit", value: "Square" }]
              },
              {
                id: 222,
                title: "Cash App Software Engineer Intern",
                absolute_url: "https://block.xyz/careers/jobs/222",
                metadata: [{ name: "Business Unit", value: "Cash App" }]
              }
            ]
          })
        )
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("111");
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
                <span class="table--advanced-search__location-sub" id="search-store-name-1">Munich</span>
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

  it("stops Apple pagination after a short final page", async () => {
    const adapter = new CustomHtmlAdapter();
    let calls = 0;
    const pageHtml = (jobId: string) => `
      <li>
        <div id="search-search-job-title-${jobId}-1">
          <div class="job-title-link">
            <h3>
              <a href="/en-us/details/${jobId}/software-engineering-intern?team=STDNT">
                Software Engineering Intern
              </a>
            </h3>
            <span class="team-name">Students</span>
            <span class="job-posted-date">Apr 01, 2026</span>
          </div>
          <div id="search-location-search-job-title-${jobId}-1">
            <span id="search-store-name-container-1">Cupertino</span>
          </div>
        </div>
      </li>
    `;

    const postings = await adapter.fetchPostings({
      company: { name: "Apple", slug: "apple" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Apple internships search",
        sourceIdentifier: "apple-internships",
        sourceUrl: "https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN",
        requestConfigJson: { maxPages: 8, pageSize: 2 },
        parserConfigJson: { parserId: "apple-search" }
      },
      fetchImpl: async (input) => {
        calls += 1;
        const url = String(input);

        if (url.includes("page=3")) {
          return new Response(pageHtml("2003"));
        }

        if (url.includes("page=4")) {
          throw new Error("should not fetch page 4");
        }

        return new Response(`${pageHtml(`200${calls}a`)}${pageHtml(`200${calls}b`)}`);
      }
    });

    expect(calls).toBe(3);
    expect(postings).toHaveLength(5);
  });

  it("normalizes DRW listings payloads from official careers HTML", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "DRW", slug: "drw" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official DRW careers listings",
        sourceIdentifier: "drw-listings",
        sourceUrl: "https://www.drw.com/work-at-drw/listings",
        parserConfigJson: { parserId: "drw-listings" }
      },
      fetchImpl: async () =>
        new Response(`
          <html>
            <body>
              <script id="__NEXT_DATA__" type="application/json">
                ${JSON.stringify({
                  props: {
                    pageProps: {
                      jobData: {
                        en: [
                          {
                            title: "Software Developer Intern",
                            id: 6926715,
                            internal_job_id: 6926715,
                            slug: "software-developer-intern-6926715",
                            locations: ["Chicago", "New York City"],
                            career_countries: ["United States", "United States"],
                            career_categories: ["Technology"],
                            job_keywords: ["software", "developer", "intern"],
                            keywords: ["software", "developer", "intern", "work at drw", "careers"],
                            language: "en"
                          }
                        ]
                      }
                    }
                  }
                })}
              </script>
            </body>
          </html>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("6926715");
    expect(postings[0]?.applicationUrl).toBe(
      "https://www.drw.com/work-at-drw/listings/software-developer-intern-6926715"
    );
    expect(postings[0]?.locationRaw).toBe("Chicago");
    expect(postings[0]?.additionalLocations).toEqual(["New York City"]);
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

  it("normalizes Google careers search HTML responses", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Google", slug: "google" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Google careers search",
        sourceIdentifier: "google-careers",
        sourceUrl: "https://www.google.com/about/careers/applications/jobs/results?q=intern",
        requestConfigJson: { maxPages: 1 },
        parserConfigJson: { parserId: "google-careers-search" }
      },
      fetchImpl: async () =>
        new Response(`
          <html>
            <body>
              <a href="jobs/results/135846492295307974-research-scientist-intern-summer-2026?q=intern">
                Research Scientist Intern
              </a>
              <script>
                AF_initDataCallback({key: 'ds:1', hash: '2', data:[[[
                  '135846492295307974',
                  'Research Scientist Intern, Summer 2026',
                  'https://www.google.com/about/careers/applications/signin?jobId=abc',
                  [null, '<ul><li>Participate in research.</li></ul>'],
                  [null, '<h3>Minimum qualifications:</h3><ul><li>Currently enrolled in a PhD program.</li></ul>'],
                  'projects/gweb-careers-proto/company/google',
                  null,
                  'Google',
                  'en-US',
                  [
                    ['Sydney NSW, Australia', ['Sydney NSW, Australia'], 'Sydney', null, 'NSW', 'AU'],
                    ['Melbourne VIC, Australia', ['Melbourne VIC, Australia'], 'Melbourne', null, 'VIC', 'AU']
                  ],
                  [null, '<p>Our Summer Internships start in late November 2026.</p>'],
                  [3, 4],
                  [1774528281, 475000000],
                  [1774528281, 475000000],
                  [1774528281, 603000000],
                  [null, '<p>Additional note.</p>'],
                  null,
                  null,
                  [null, ''],
                  [null, '<ul><li>Currently enrolled in a PhD program.</li></ul>'],
                  5
                ]], null, 1, 20], sideChannel: {}});
              </script>
            </body>
          </html>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("135846492295307974");
    expect(postings[0]?.title).toBe("Research Scientist Intern, Summer 2026");
    expect(postings[0]?.sourceUrl).toBe(
      "https://www.google.com/about/careers/applications/jobs/results/135846492295307974-research-scientist-intern-summer-2026?q=intern"
    );
    expect(postings[0]?.locationRaw).toBe("Sydney NSW, Australia");
    expect(postings[0]?.additionalLocations).toEqual(["Melbourne VIC, Australia"]);
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

  it("normalizes Microsoft careers API responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Microsoft", slug: "microsoft" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Microsoft careers search",
        sourceIdentifier: "microsoft-pcsx",
        sourceUrl:
          "https://apply.careers.microsoft.com/api/pcsx/search?domain=microsoft.com&query=intern&location=&filter_employment_type=Internship",
        requestConfigJson: { pageSize: 10, maxPages: 1, fetchDetails: true },
        parserConfigJson: { parserId: "microsoft-pcsx-search" }
      },
      fetchImpl: async (url) => {
        const requestUrl = typeof url === "string" ? url : url.toString();

        if (requestUrl.includes("/api/pcsx/search")) {
          return new Response(
            JSON.stringify({
              data: {
                count: 1,
                positions: [
                  {
                    id: 1970393556856340,
                    displayJobId: "200034082",
                    name: "Research Intern - AI Frontiers - Reasoning & Agentic Models",
                    locations: ["United States, Washington, Redmond"],
                    standardizedLocations: ["Redmond, WA, US"],
                    postedTs: 1775169318,
                    department: "Applied Sciences",
                    workLocationOption: "onsite",
                    atsJobId: "200034082",
                    positionUrl: "/careers/job/1970393556856340"
                  }
                ]
              }
            })
          );
        }

        return new Response(
          JSON.stringify({
            data: {
              id: 1970393556856340,
              displayJobId: "200034082",
              name: "Research Intern - AI Frontiers - Reasoning & Agentic Models",
              locations: ["United States, Washington, Redmond"],
              standardizedLocations: ["Redmond, WA, US", "Mountain View, CA, US"],
              postedTs: 1775169318,
              department: "Applied Sciences",
              workLocationOption: "onsite",
              atsJobId: "200034082",
              publicUrl: "https://apply.careers.microsoft.com/careers/job/1970393556856340",
              location: "United States, Washington, Redmond",
              jobDescription:
                "<b>Overview</b><p>Research Internships at Microsoft provide a dynamic environment.</p><p>Applied Sciences IC2 - The base pay range for this internship is USD $5,610 - $11,010 per month.</p>",
              efcustomTextEmploymentType: ["Internship"]
            }
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("200034082");
    expect(postings[0]?.applicationUrl).toBe(
      "https://apply.careers.microsoft.com/careers/job/1970393556856340"
    );
    expect(postings[0]?.locationRaw).toBe("United States, Washington, Redmond");
    expect(postings[0]?.additionalLocations).toEqual(["Mountain View, CA, US"]);
    expect(postings[0]?.payRaw).toContain("USD $5,610 - $11,010 per month");
  });

  it("normalizes GitHub careers API responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "GitHub", slug: "github" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official GitHub careers API",
        sourceIdentifier: "github-jibe",
        sourceUrl: "https://www.github.careers/api/jobs",
        requestConfigJson: { maxPages: 3 },
        parserConfigJson: { parserId: "github-jibe-jobs" }
      },
      fetchImpl: async (url) => {
        const requestUrl = new URL(typeof url === "string" ? url : url.toString());
        const page = requestUrl.searchParams.get("page") ?? "1";

        if (page === "2") {
          return new Response(
            JSON.stringify({
              count: 2,
              totalCount: 2,
              jobs: [
                {
                  data: {
                    slug: "6001",
                    req_id: "6001",
                    title: "Software Engineering Intern",
                    description: "<p>Compensation range: USD $40.00 - $50.00 /Hr.</p>",
                    location_name: "Remote, United States",
                    country: "United States",
                    country_code: "US",
                    location_type: "ANY",
                    posted_date: "2026-04-12",
                    apply_url: "https://careers-githubinc.icims.com/jobs/6001/login",
                    category: "Engineering",
                    meta_data: {
                      canonical_url: "https://githubinc.jibeapply.com/jobs/6001?lang=en-us"
                    }
                  }
                }
              ]
            })
          );
        }

        return new Response(
          JSON.stringify({
            count: 2,
            totalCount: 2,
            jobs: [
              {
                data: {
                  slug: "5239",
                  req_id: "5239",
                  title: "Master Data Management & Data Quality Intern",
                  description:
                    "In this role you can work from Remote, United States. Compensation Range The base salary range for this job is USD $31.82 - USD $84.42 /Hr.",
                  location_name: "US Remote",
                  country: "United States",
                  country_code: "US",
                  location_type: "ANY",
                  posted_date: "2026-03-27",
                  apply_url: "https://careers-githubinc.icims.com/jobs/5239/login",
                  categories: [{ name: "Revenue" }],
                  tags2: ["US-Remote"],
                  meta_data: {
                    canonical_url: "https://githubinc.jibeapply.com/jobs/5239?lang=en-us"
                  }
                }
              }
            ]
          })
        );
      }
    });

    expect(postings).toHaveLength(2);
    expect(postings[0]?.externalJobId).toBe("5239");
    expect(postings[0]?.sourceUrl).toBe("https://githubinc.jibeapply.com/jobs/5239?lang=en-us");
    expect(postings[0]?.applicationUrl).toBe("https://careers-githubinc.icims.com/jobs/5239/login");
    expect(postings[0]?.locationRaw).toBe("US Remote");
    expect(postings[0]?.remoteTypeHint).toBe("Remote");
    expect(postings[0]?.payRaw).toContain("USD $31.82 - USD $84.42 /Hr.");
    expect(postings[1]?.title).toBe("Software Engineering Intern");
  });

  it("normalizes AMD careers Jibe API responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "AMD", slug: "amd" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official AMD careers API",
        sourceIdentifier: "amd-jibe",
        sourceUrl: "https://careers.amd.com/api/jobs",
        requestConfigJson: { maxPages: 2, query: "intern", queryParamName: "keywords" },
        parserConfigJson: { parserId: "jibe-jobs" }
      },
      fetchImpl: async (url) => {
        const requestUrl = new URL(typeof url === "string" ? url : url.toString());
        const page = requestUrl.searchParams.get("page") ?? "1";

        if (page === "2") {
          return new Response(
            JSON.stringify({
              count: 2,
              totalCount: 2,
              jobs: [
                {
                  data: {
                    slug: "76975",
                    req_id: "76975",
                    title: "Summer 2026 - Data Analyst Intern",
                    description:
                      "<p>As an AMD intern, you'll work full time during Summer 2026.</p>",
                    location_name: "TW,Taipei",
                    full_location: "Taipei City 115, Taiwan",
                    country: "Taiwan",
                    country_code: "TW",
                    posted_date: "2025-12-31T04:58:00+0000",
                    apply_url: "https://globalcampus-amd.icims.com/jobs/76975/login",
                    categories: [{ name: "Student / Intern / Temp" }],
                    tags2: ["TWD NT$0.00/Yr."],
                    meta_data: {
                      canonical_url: "https://careers.amd.com/jobs/76975?lang=en-us"
                    }
                  }
                }
              ]
            })
          );
        }

        return new Response(
          JSON.stringify({
            count: 2,
            totalCount: 2,
            jobs: [
              {
                data: {
                  slug: "80001",
                  req_id: "80001",
                  title: "GPU Performance Intern",
                  description: "<p>Internship role</p>",
                  location_name: "Austin, TX",
                  full_location: "Austin, Texas, United States",
                  country: "United States",
                  country_code: "US",
                  posted_date: "2026-01-15T00:00:00+0000",
                  apply_url: "https://globalcampus-amd.icims.com/jobs/80001/login",
                  categories: [{ name: "Student / Intern / Temp" }],
                  meta_data: {
                    canonical_url: "https://careers.amd.com/jobs/80001?lang=en-us"
                  }
                }
              }
            ]
          })
        );
      }
    });

    expect(postings).toHaveLength(2);
    expect(postings[0]?.applicationUrl).toBe("https://globalcampus-amd.icims.com/jobs/80001/login");
    expect(postings[0]?.sourceUrl).toBe("https://careers.amd.com/jobs/80001?lang=en-us");
    expect(postings[1]?.title).toBe("Summer 2026 - Data Analyst Intern");
  });

  it("normalizes generic pcsx responses on non-Microsoft domains", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Qualcomm", slug: "qualcomm" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Qualcomm careers search",
        sourceIdentifier: "qualcomm-pcsx",
        sourceUrl:
          "https://careers.qualcomm.com/api/pcsx/search?domain=qualcomm.com&query=intern&location=",
        requestConfigJson: { pageSize: 10, maxPages: 1 },
        parserConfigJson: { parserId: "pcsx-search" }
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: {
              count: 1,
              positions: [
                {
                  id: 446717272560,
                  displayJobId: "3087413",
                  name: "2026 Summer Intern-Computer Vision Research intern",
                  locations: ["Shanghai, Shanghai, China"],
                  standardizedLocations: ["Shanghai, Shanghai, CN"],
                  postedTs: 1772755200,
                  department: "Interim Engineering Intern - SW",
                  workLocationOption: "onsite",
                  atsJobId: "3087413",
                  positionUrl: "/careers/job/446717272560"
                }
              ]
            }
          })
        )
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("3087413");
    expect(postings[0]?.applicationUrl).toBe("https://careers.qualcomm.com/careers/job/446717272560");
    expect(postings[0]?.locationRaw).toBe("Shanghai, Shanghai, CN");
  });

  it("normalizes Salesforce RSS job feeds", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Salesforce", slug: "salesforce" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Salesforce jobs RSS",
        sourceIdentifier: "salesforce-rss",
        sourceUrl: "https://careers.salesforce.com/en/jobs/xml/?rss=true",
        parserConfigJson: { parserId: "salesforce-rss" }
      },
      fetchImpl: async () =>
        new Response(`<?xml version="1.0" encoding="utf-8" standalone="yes"?>
          <source>
            <job>
              <title><![CDATA[Software Engineering Intern]]></title>
              <date><![CDATA[Wed, 15 Apr 2026 00:00:00 GMT]]></date>
              <requisitionid><![CDATA[JR999999]]></requisitionid>
              <apijobid><![CDATA[jr999999]]></apijobid>
              <url><![CDATA[https://careers.salesforce.com/en/jobs/jr999999/software-engineering-intern/]]></url>
              <company><![CDATA[Salesforce, Inc.]]></company>
              <city><![CDATA[San Francisco]]></city>
              <state><![CDATA[California]]></state>
              <country><![CDATA[United States of America]]></country>
              <description><![CDATA[<p>Join Futureforce as a software engineering intern.</p>]]></description>
              <jobtype><![CDATA[Internship]]></jobtype>
              <category><![CDATA[Engineering]]></category>
              <sourcename><![CDATA[Salesforce, Inc.]]></sourcename>
              <remotetype><![CDATA[Hybrid]]></remotetype>
            </job>
          </source>`)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("JR999999");
    expect(postings[0]?.locationRaw).toBe("San Francisco, California, United States of America");
    expect(postings[0]?.employmentType).toBe("Internship");
    expect(postings[0]?.remoteTypeHint).toBe("Hybrid");
  });

  it("normalizes Meta careers GraphQL search responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Meta", slug: "meta" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Meta careers search",
        sourceIdentifier: "meta-careers-intern",
        sourceUrl: "https://www.facebook.com/api/graphql/",
        requestConfigJson: { query: "intern", docId: "26228555073499023" },
        parserConfigJson: { parserId: "meta-careers-search" }
      },
      fetchImpl: async (_url, init) => {
        expect(init?.method).toBe("POST");
        expect(String(init?.body)).toContain("CareersJobSearchInputDropdownDataQuery");

        return new Response(
          JSON.stringify({
            data: {
              job_search_with_featured_jobs: {
                all_jobs: [
                  {
                    id: "1711265486214382",
                    title: "Software Engineer Intern, Product",
                    locations: [{ name: "Menlo Park, CA" }, { name: "New York, NY" }],
                    teams: [{ name: "Engineering" }],
                    job_type: "Internship"
                  }
                ]
              }
            }
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("1711265486214382");
    expect(postings[0]?.applicationUrl).toBe(
      "https://www.metacareers.com/jobs/1711265486214382/"
    );
    expect(postings[0]?.locationRaw).toBe("Menlo Park, CA");
    expect(postings[0]?.additionalLocations).toEqual(["New York, NY"]);
  });

  it("normalizes Oracle HCM careers search responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Oracle", slug: "oracle" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Oracle careers search",
        sourceIdentifier: "oracle-hcm-jobsearch",
        sourceUrl:
          "https://eeho.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
        requestConfigJson: {
          siteNumber: "CX_45001",
          searchText: "intern",
          selectedLocationsFacet: "300000000149325",
          pageSize: 24,
          maxPages: 1
        },
        parserConfigJson: { parserId: "oracle-hcm-search" }
      },
      fetchImpl: async (url) => {
        const requestUrl = new URL(typeof url === "string" ? url : url.toString());

        expect(requestUrl.searchParams.get("finder")).toContain("selectedLocationsFacet=300000000149325");

        return new Response(
          JSON.stringify({
            items: [
              {
                TotalJobsCount: 1,
                requisitionList: [
                  {
                    Id: "332121",
                    Title: "OCI Sustainability Intern",
                    PostedDate: "2026-04-24",
                    PrimaryLocation: "Seattle, WA, United States",
                    PrimaryLocationCountry: "US",
                    ShortDescriptionStr: "Internship role intended for current students.",
                    WorkplaceType: "Onsite",
                    JobFunction: "Product Development",
                    secondaryLocations: [{ Name: "Nashville, TN, United States" }]
                  }
                ]
              }
            ]
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("332121");
    expect(postings[0]?.applicationUrl).toBe("https://careers.oracle.com/en/sites/jobsearch/job/332121");
    expect(postings[0]?.locationRaw).toBe("Seattle, WA, United States");
    expect(postings[0]?.additionalLocations).toEqual(["Nashville, TN, United States"]);
  });

  it("normalizes SmartRecruiters postings with detail fetches", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "ServiceNow", slug: "servicenow" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official ServiceNow careers API",
        sourceIdentifier: "servicenow-smartrecruiters",
        sourceUrl: "https://api.smartrecruiters.com/v1/companies/ServiceNow/postings",
        requestConfigJson: { query: "intern", pageSize: 100, maxPages: 1, fetchDetails: true },
        parserConfigJson: { parserId: "smartrecruiters-postings" }
      },
      fetchImpl: async (url) => {
        const requestUrl = typeof url === "string" ? url : url.toString();

        if (requestUrl.endsWith("/postings/srv-1")) {
          return new Response(
            JSON.stringify({
              id: "srv-1",
              name: "Software Engineer Intern",
              refNumber: "JR123456",
              releasedDate: "2026-04-20T00:00:00.000Z",
              postingUrl: "https://jobs.smartrecruiters.com/ServiceNow/srv-1-software-engineer-intern",
              applyUrl: "https://careers.servicenow.com/apply/srv-1",
              location: { city: "San Diego", region: "CA", country: "United States" },
              typeOfEmployment: { label: "Intern" },
              department: { label: "Engineering" },
              jobAd: {
                sections: {
                  jobDescription: { title: "Job Description", text: "<p>Internship role.</p>" }
                }
              }
            })
          );
        }

        return new Response(
          JSON.stringify({
            totalFound: 1,
            content: [{ id: "srv-1", name: "Software Engineer Intern", refNumber: "JR123456" }]
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("JR123456");
    expect(postings[0]?.applicationUrl).toBe("https://careers.servicenow.com/apply/srv-1");
    expect(postings[0]?.locationRaw).toBe("San Diego, CA, United States");
    expect(postings[0]?.employmentType).toBe("Intern");
  });

  it("normalizes TikTok careers API responses using US location filters", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "TikTok", slug: "tiktok" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Life at TikTok careers API",
        sourceIdentifier: "tiktok-life-at-tiktok",
        sourceUrl: "https://api.lifeattiktok.com/api/v1/public/supplier/search/job/posts",
        requestConfigJson: {
          query: "intern",
          recruitmentIds: ["202"],
          filtersUrl: "https://api.lifeattiktok.com/api/v1/public/supplier/config/job/filters",
          countryName: "United States of America",
          pageSize: 50,
          maxPagesPerLocation: 1
        },
        parserConfigJson: { parserId: "tiktok-search" }
      },
      fetchImpl: async (url, init) => {
        const requestUrl = typeof url === "string" ? url : url.toString();

        if (requestUrl.includes("/filters")) {
          return new Response(
            JSON.stringify({
              data: {
                city_list: [
                  {
                    code: "CT_94",
                    en_name: "Los Angeles",
                    parent: {
                      code: "ST_31",
                      en_name: "California",
                      parent: { code: "CN_6", en_name: "United States of America" }
                    }
                  }
                ]
              }
            })
          );
        }

        expect(JSON.parse(String(init?.body)).location_code_list).toEqual(["CT_94"]);

        return new Response(
          JSON.stringify({
            data: {
              count: 1,
              job_post_list: [
                {
                  id: "7626859840586418437",
                  code: "A73175",
                  title: "Product Operations Project Intern - 2026 Start",
                  description: "Internships at TikTok aim to provide students with hands-on experience.",
                  requirement: "Currently enrolled in a Bachelor's Degree program or above.",
                  recruit_type: { id: "202", en_name: "Intern" },
                  job_category: { en_name: "Product" },
                  job_subject: { en_name: "Project Intern" },
                  city_info: {
                    code: "CT_94",
                    en_name: "Los Angeles",
                    parent: {
                      code: "ST_31",
                      en_name: "California",
                      parent: { code: "CN_6", en_name: "United States of America" }
                    }
                  }
                }
              ]
            }
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("A73175");
    expect(postings[0]?.applicationUrl).toBe("https://lifeattiktok.com/search?job_code=A73175");
    expect(postings[0]?.locationRaw).toBe("Los Angeles, California, United States of America");
    expect(postings[0]?.employmentType).toBe("Intern");
  });

  it("normalizes Uber careers search responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Uber", slug: "uber" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Uber careers search",
        sourceIdentifier: "uber-careers-search",
        sourceUrl: "https://www.uber.com/api/loadSearchJobsResults?localeCode=en",
        requestConfigJson: { query: "intern", pageSize: 25, maxPages: 1 },
        parserConfigJson: { parserId: "uber-search" }
      },
      fetchImpl: async (_url, init) => {
        expect(JSON.parse(String(init?.body)).params.query).toBe("intern");

        return new Response(
          JSON.stringify({
            status: "success",
            data: {
              totalResults: { low: 1 },
              results: [
                {
                  id: 12345,
                  title: "2026 Software Engineering Intern",
                  description: "About the Internship",
                  department: "University",
                  team: "Engineering",
                  timeType: "Intern",
                  creationDate: "2026-04-10T00:00:00.000Z",
                  location: {
                    city: "San Francisco",
                    region: "CA",
                    country: "USA",
                    countryName: "United States"
                  },
                  allLocations: [
                    {
                      city: "San Francisco",
                      region: "CA",
                      country: "USA",
                      countryName: "United States"
                    },
                    {
                      city: "New York",
                      region: "NY",
                      country: "USA",
                      countryName: "United States"
                    }
                  ]
                }
              ]
            }
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("12345");
    expect(postings[0]?.sourceUrl).toBe("https://www.uber.com/us/en/careers/list/12345/");
    expect(postings[0]?.locationRaw).toBe("San Francisco, CA, United States");
    expect(postings[0]?.additionalLocations).toEqual(["New York, NY, United States"]);
  });

  it("normalizes Eightfold careers API responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Millennium", slug: "millennium" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Millennium careers API via Eightfold",
        sourceIdentifier: "millennium-eightfold",
        sourceUrl:
          "https://mlp.eightfold.ai/api/apply/v2/jobs?domain=mlp.com&pid=0&sort_by=relevance",
        requestConfigJson: { query: "intern", pageSize: 10, maxPages: 1 },
        parserConfigJson: { parserId: "eightfold-jobs" }
      },
      fetchImpl: async (url) => {
        expect(url.toString()).toContain("query=intern");
        expect(url.toString()).toContain("start=0");

        return new Response(
          JSON.stringify({
            count: 1,
            positions: [
              {
                id: 755938378815,
                posting_name: "Quantitative Research Intern",
                location: "New York, United States",
                locations: ["New York, United States"],
                t_create: 1780272000,
                display_job_id: "REQ-12345",
                type: "ATS",
                job_description: "<p>Internship</p>",
                work_location_option: "onsite",
                canonicalPositionUrl: "https://mlp.eightfold.ai/careers/job/755938378815"
              }
            ]
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("REQ-12345");
    expect(postings[0]?.sourceUrl).toBe("https://mlp.eightfold.ai/careers/job/755938378815");
  });

  it("normalizes Phenom refineSearch API responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Yelp", slug: "yelp" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official Yelp careers API via Phenom",
        sourceIdentifier: "yelp-phenom",
        sourceUrl: "https://www.yelp.careers/widgets",
        requestConfigJson: {
          query: "intern",
          refNum: "YELPUS",
          lang: "en_us",
          locale: "en_us",
          country: "us",
          pageId: "page18",
          detailBaseUrl: "https://www.yelp.careers/us/en/job",
          pageSize: 10,
          maxPages: 1
        },
        parserConfigJson: { parserId: "phenom-refine-search" }
      },
      fetchImpl: async (_url, init) => {
        expect(JSON.parse(String(init?.body)).keywords).toBe("intern");

        return new Response(
          JSON.stringify({
            refineSearch: {
              status: 200,
              data: {
                jobs: [
                  {
                    jobId: "13930",
                    reqId: "13930",
                    jobSeqNo: "YELPUS13930EXTERNALENUS",
                    title: "Community Intern, Austin",
                    type: "Intern (Part-Time)",
                    applyUrl: "https://uscareers-yelp.icims.com/jobs/13930/job",
                    postedDate: "2026-06-01T00:00:00.000+0000",
                    location: "Austin, Texas, United States",
                    category: "Community",
                    ml_job_parser: {
                      descriptionTeaser_ats: "Yelp community internship."
                    }
                  }
                ]
              }
            }
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("YELPUS13930EXTERNALENUS");
    expect(postings[0]?.sourceUrl).toBe(
      "https://www.yelp.careers/us/en/job/YELPUS13930EXTERNALENUS/community-intern-austin"
    );
    expect(postings[0]?.locationRaw).toBe("Austin, Texas, United States");
  });

  it("normalizes generic RSS item responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "SAP", slug: "sap" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official SAP jobs RSS",
        sourceIdentifier: "sap-rss-internship",
        sourceUrl: "https://jobs.sap.com/services/rss/job/?locale=en_US&keywords=(internship)",
        parserConfigJson: { parserId: "generic-rss-items" }
      },
      fetchImpl: async () =>
        new Response(`
          <rss version="2.0">
            <channel>
              <item>
                <title><![CDATA[SAP iXp Intern - Digital Solution Advisory (Alpharetta, GA, US, 30009)]]></title>
                <link>https://jobs.sap.com/job/Alpharetta-SAP-iXp-Intern/1398744433/</link>
                <guid>https://jobs.sap.com/job/Alpharetta-SAP-iXp-Intern/1398744433/</guid>
                <pubDate>Fri, 05 Jun 2026 12:00:00 GMT</pubDate>
                <description><![CDATA[<p>Internship role.</p>]]></description>
              </item>
            </channel>
          </rss>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.title).toBe("SAP iXp Intern - Digital Solution Advisory");
    expect(postings[0]?.locationRaw).toBe("Alpharetta, GA, US, 30009");
    expect(postings[0]?.sourceUrl).toBe(
      "https://jobs.sap.com/job/Alpharetta-SAP-iXp-Intern/1398744433/"
    );
  });

  it("normalizes IBM careers search responses", async () => {
    const adapter = new CustomApiAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "IBM", slug: "ibm" },
      source: {
        sourceType: "CUSTOM_API",
        sourceName: "Official IBM careers search",
        sourceIdentifier: "ibm-careers-search",
        sourceUrl: "https://www-api.ibm.com/search/api/v1/ibmcom/appid/careers/responseFormat/json",
        requestConfigJson: {
          query: "intern",
          appId: "careers",
          scope: "careers2",
          detailBaseUrl: "https://careers.ibm.com/en_US/careers/JobDetail",
          pageSize: 10,
          maxPages: 1
        },
        parserConfigJson: { parserId: "ibm-careers-search" }
      },
      fetchImpl: async (url) => {
        const requestUrl = new URL(typeof url === "string" ? url : url.toString());

        expect(requestUrl.searchParams.get("scope")).toBe("careers2");
        expect(requestUrl.searchParams.get("appid")).toBe("careers");
        expect(requestUrl.searchParams.get("query")).toBe("intern");

        return new Response(
          JSON.stringify({
            resultset: {
              searchresults: {
                totalresults: 1,
                searchresultlist: [
                  {
                    id: "hash-1",
                    title: "Returning Intern: Software Developer",
                    description: "Short IBM internship description.",
                    language: "en",
                    url: "https://careers.ibm.com/careers/JobDetail?jobId=115594",
                    docattributes: [
                      { dcdate: "2026-06-05" },
                      { field_keyword_05: "United States" },
                      { field_keyword_08: "Software Engineering" },
                      { field_keyword_17: "Hybrid" },
                      { field_keyword_18: "Internship" },
                      { field_keyword_19: "Multiple Cities" },
                      { field_text_01: "115594" },
                      { raw_body: "<p>Full IBM internship description.</p>" }
                    ]
                  }
                ]
              }
            }
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("115594");
    expect(postings[0]?.sourceUrl).toBe(
      "https://careers.ibm.com/en_US/careers/JobDetail?jobId=115594&source=WEB_Search_NA"
    );
    expect(postings[0]?.locationRaw).toBe("Multiple Cities, United States");
    expect(postings[0]?.remoteTypeHint).toBe("Hybrid");
    expect(postings[0]?.metadata?.team).toBe("Software Engineering");
  });

  it("normalizes TalentBrew search cards", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Arm", slug: "arm" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Arm careers search",
        sourceIdentifier: "arm-talentbrew-intern",
        sourceUrl: "https://careers.arm.com/search-jobs/intern",
        requestConfigJson: { maxPages: 1 },
        parserConfigJson: { parserId: "talentbrew-search" }
      },
      fetchImpl: async () =>
        new Response(`
          <li class="job-card fs-start">
            <a class="job-card__title fs-11" href="/job/austin/software-engineering-intern/33099/12345" data-job-id="12345">Software Engineering Intern</a>
            <span class="job-card__intro">Work on CPU tools.</span>
            <span class="location">Austin, Texas</span>
            <span class="category">Software Engineering</span>
          </li>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("12345");
    expect(postings[0]?.sourceUrl).toBe(
      "https://careers.arm.com/job/austin/software-engineering-intern/33099/12345"
    );
    expect(postings[0]?.descriptionText).toBe("Work on CPU tools.");
    expect(postings[0]?.locationRaw).toBe("Austin, Texas");
  });

  it("normalizes Shopify careers HTML postings", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Shopify", slug: "shopify" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Shopify careers page",
        sourceIdentifier: "shopify-careers",
        sourceUrl: "https://www.shopify.com/jobs/",
        parserConfigJson: { parserId: "shopify-careers" }
      },
      fetchImpl: async () =>
        new Response(`
          <a href="/careers/data-and-engineering-internships-fall-2026_123">
            <h4>Data And Engineering Internships Fall 2026</h4>
            <span>Remote - Americas</span>
          </a>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("data-and-engineering-internships-fall-2026_123");
    expect(postings[0]?.sourceUrl).toBe(
      "https://www.shopify.com/careers/data-and-engineering-internships-fall-2026_123"
    );
    expect(postings[0]?.locationRaw).toBe("Remote - Americas");
  });

  it("normalizes Bloomberg Avature careers HTML postings", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Bloomberg", slug: "bloomberg" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Bloomberg careers search",
        sourceIdentifier: "bloomberg-avature",
        sourceUrl:
          "https://bloomberg.avature.net/careers/SearchJobs/?jobOffset=0&jobRecordsPerPage=20&keywords=intern",
        requestConfigJson: { pageSize: 20, maxPages: 1 },
        parserConfigJson: { parserId: "bloomberg-avature-search" }
      },
      fetchImpl: async () =>
        new Response(`
          <article class="article article--result">
            <a class="link" href="https://bloomberg.avature.net/careers/JobDetail/2026-Software-Engineer-Intern/18773">
              2026 Software Engineer Intern
            </a>
            <span class="list-item-location">New York, New York, United States of America</span>
          </article>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("18773");
    expect(postings[0]?.title).toBe("2026 Software Engineer Intern");
    expect(postings[0]?.locationRaw).toBe("New York, New York, United States of America");
  });

  it("normalizes D. E. Shaw embedded careers postings", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "DE Shaw", slug: "de-shaw" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official D. E. Shaw careers page",
        sourceIdentifier: "deshaw-careers",
        sourceUrl: "https://www.deshaw.com/careers",
        parserConfigJson: { parserId: "deshaw-careers" }
      },
      fetchImpl: async () =>
        new Response(`
          <script id="__NEXT_DATA__" type="application/json">
            {"props":{"pageProps":{"regularJobs":[{"data":{"id":5911,"displayName":"Quantitative Analyst Intern","validFromDate":"2026-05-04","jobUrl":"/careers/quantitative-analyst-intern-5911","jobDescription":{"onCampusDescription":"<p>Internship</p>"},"jobMetadata":{"jobLocations":[{"name":"New York"}],"jobSeekerCategories":[{"name":"Students"}]},"jobCategory":[{"name":"Quantitative Research"}],"department":{"name":"Research"},"hireType":{"name":"Intern"}}}]}}}
          </script>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("5911");
    expect(postings[0]?.sourceUrl).toBe(
      "https://www.deshaw.com/careers/quantitative-analyst-intern-5911"
    );
    expect(postings[0]?.locationRaw).toBe("New York");
  });

  it("normalizes G-Research vacancy cards", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "G-Research", slug: "g-research" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official G-Research vacancies page",
        sourceIdentifier: "gresearch-vacancies",
        sourceUrl: "https://www.gresearch.com/vacancies/",
        requestConfigJson: { maxPages: 1 },
        parserConfigJson: { parserId: "gresearch-vacancies" }
      },
      fetchImpl: async () =>
        new Response(`
          <a href="https://www.gresearch.com/vacancies/software-engineering-internship/" class="c-vacancy-result">
            <span class="c-vacancy-result__title">Software Engineering Internship</span>
            <span class="c-vacancy-result__location">London</span>
          </a>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("software-engineering-internship");
    expect(postings[0]?.locationRaw).toBe("London");
  });

  it("normalizes Two Sigma Avature cards", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Two Sigma", slug: "two-sigma" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official Two Sigma careers page",
        sourceIdentifier: "two-sigma-avature",
        sourceUrl: "https://careers.twosigma.com/",
        parserConfigJson: { parserId: "two-sigma-avature-cards" }
      },
      fetchImpl: async () =>
        new Response(`
          <article class="article article--card">
            <a class="link" href="https://careers.twosigma.com/careers/JobDetail/New-York-Software-Engineer/13940">
              Software Engineer
            </a>
            <p><strong>Location</strong><span class="paragraph_inner-span">United States - NY New York</span></p>
            <p><strong>Function</strong><span class="paragraph_inner-span">Engineering</span></p>
            <p><strong>Experience Level</strong><span class="paragraph_inner-span">Experienced</span></p>
          </article>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("13940");
    expect(postings[0]?.locationRaw).toBe("United States - NY New York");
  });

  it("normalizes Paylocity pageData postings", async () => {
    const adapter = new CustomHtmlAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "XR Trading", slug: "xr-trading" },
      source: {
        sourceType: "CUSTOM_HTML",
        sourceName: "Official XR Trading careers page via Paylocity",
        sourceIdentifier: "xr-trading-paylocity",
        sourceUrl:
          "https://recruiting.paylocity.com/recruiting/jobs/All/5c109104-7c4d-415c-9ee4-54e3af55f9e7/XR-Trading-LLC",
        parserConfigJson: { parserId: "paylocity-page-data" }
      },
      fetchImpl: async () =>
        new Response(`
          <script>
            window.pageData = {"Jobs":[{"JobId":2303630,"JobTitle":"IT YEAR-ROUND INTERN","LocationName":"Chicago On-Site","PublishedDate":"2026-05-19T17:05:34-05:00","Description":"<p>Internship</p>","IsRemote":false,"HiringDepartment":null}]};
          </script>
        `)
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("2303630");
    expect(postings[0]?.applicationUrl).toBe(
      "https://recruiting.paylocity.com/Recruiting/Jobs/Apply/2303630"
    );
    expect(postings[0]?.locationRaw).toBe("Chicago On-Site");
  });

  it("normalizes Workday internship responses", async () => {
    const adapter = new WorkdayAdapter();
    const postings = await adapter.fetchPostings({
      company: { name: "Nvidia", slug: "nvidia" },
      source: {
        sourceType: "WORKDAY",
        sourceName: "Official Nvidia Workday",
        sourceIdentifier: "nvidia-workday",
        sourceUrl: "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs",
        requestConfigJson: {
          pageSize: 20,
          maxPages: 1,
          appliedFacets: {
            workerSubType: ["0c40f6bd1d8f10adf6dae42e46d44a17"]
          }
        }
      },
      fetchImpl: async (url, init) => {
        const requestUrl = typeof url === "string" ? url : url.toString();

        if (requestUrl.endsWith("/jobs") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              total: 1,
              jobPostings: [
                {
                  title: "AI for Chip Design Intern - Summer 2026",
                  externalPath:
                    "/job/US-CA-Santa-Clara/AI-for-Chip-Design-Intern---Summer-2026_JR2011182",
                  locationsText: "US, CA, Santa Clara",
                  postedOn: "Posted 13 Days Ago",
                  bulletFields: ["JR2011182"]
                }
              ]
            })
          );
        }

        return new Response(
          JSON.stringify({
            jobPostingInfo: {
              title: "AI for Chip Design Intern - Summer 2026",
              jobDescription:
                "<p>NVIDIA has been redefining computer graphics.</p><p>The hourly rate for our interns is 20 USD - 71 USD.</p>",
              location: "US, CA, Santa Clara",
              postedOn: "Posted 13 Days Ago",
              startDate: "2026-03-10",
              timeType: "Full time",
              jobReqId: "JR2011182",
              jobPostingId: "AI-for-Chip-Design-Intern---Summer-2026_JR2011182",
              externalUrl:
                "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/AI-for-Chip-Design-Intern---Summer-2026_JR2011182",
              canApply: true,
              posted: true,
              jobRequisitionLocation: {
                descriptor: "US, CA, Santa Clara",
                country: {
                  descriptor: "United States of America",
                  alpha2Code: "US"
                }
              }
            }
          })
        );
      }
    });

    expect(postings).toHaveLength(1);
    expect(postings[0]?.externalJobId).toBe("JR2011182");
    expect(postings[0]?.title).toBe("AI for Chip Design Intern - Summer 2026");
    expect(postings[0]?.applicationUrl).toBe(
      "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/AI-for-Chip-Design-Intern---Summer-2026_JR2011182"
    );
    expect(postings[0]?.locationRaw).toBe("US, CA, Santa Clara");
    expect(postings[0]?.payRaw).toContain("20 USD - 71 USD");
  });

  it("bounds Workday detail requests while preserving search order", async () => {
    const adapter = new WorkdayAdapter();
    let activeDetails = 0;
    let peakDetails = 0;

    const postings = await adapter.fetchPostings({
      company: { name: "Example", slug: "example" },
      source: {
        sourceType: "WORKDAY",
        sourceName: "Example Workday",
        sourceIdentifier: "example-workday",
        sourceUrl: "https://example.wd5.myworkdayjobs.com/wday/cxs/example/site/jobs",
        requestConfigJson: { pageSize: 20, maxPages: 1, detailConcurrency: 2 }
      },
      fetchImpl: async (url, init) => {
        const requestUrl = typeof url === "string" ? url : url.toString();

        if (requestUrl.endsWith("/jobs") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              total: 3,
              jobPostings: [
                { title: "First", externalPath: "/job/first", bulletFields: ["REQ-1"] },
                { title: "Second", externalPath: "/job/second", bulletFields: ["REQ-2"] },
                { title: "Third", externalPath: "/job/third", bulletFields: ["REQ-3"] }
              ]
            })
          );
        }

        const jobId = new URL(requestUrl).pathname.split("/").at(-1) ?? "unknown";
        const delayMs = jobId === "first" ? 20 : 0;
        activeDetails += 1;
        peakDetails = Math.max(peakDetails, activeDetails);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        activeDetails -= 1;

        return new Response(
          JSON.stringify({
            jobPostingInfo: {
              title: jobId,
              jobReqId: `REQ-${jobId === "first" ? "1" : jobId === "second" ? "2" : "3"}`,
              externalUrl: `https://example.com/jobs/${jobId}`
            }
          })
        );
      }
    });

    expect(peakDetails).toBe(2);
    expect(postings.map((posting) => posting.externalJobId)).toEqual(["REQ-1", "REQ-2", "REQ-3"]);
  });
});
