import { describe, expect, it } from "vitest";
import { AshbyAdapter } from "../src/adapters/ashby";
import { CustomApiAdapter } from "../src/adapters/custom-api";
import { CustomHtmlAdapter } from "../src/adapters/custom-html";
import { GreenhouseAdapter } from "../src/adapters/greenhouse";
import { LeverAdapter } from "../src/adapters/lever";
import { WorkdayAdapter } from "../src/adapters/workday";

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
});
