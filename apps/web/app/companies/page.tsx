import { Badge, Button, Card, CardContent, Container, EmptyState, PageHeader } from "@faang-quant/ui";
import Link from "next/link";
import {
  getCompaniesOverviewPage,
  parseCompaniesPage,
  type CompanyOverview
} from "../../lib/company-queries";
import { safeExternalUrl } from "../../lib/validation";

type SearchParams = Record<string, string | string[] | undefined>;

function pageHref(searchParams: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    } else {
      query.set(key, value);
    }
  }
  query.set("page", String(page));
  return `/companies?${query.toString()}`;
}

function CompanyCard({ company }: { company: CompanyOverview }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-display text-2xl font-semibold tracking-tight text-brand-700">
                {company.name}
              </div>
              <Badge tone="brand">{company.companyBucket.replaceAll("_", " ")}</Badge>
              <Badge tone="neutral">{company.trackedSourceCount} sources</Badge>
              <Badge tone={company.activeInternshipCount > 0 ? "success" : "neutral"}>
                {company.activeInternshipCount} active internships
              </Badge>
            </div>

            <div className="text-sm text-slate-500">
              {company.careersUrl ?? company.websiteUrl ?? company.slug}
            </div>
          </div>

          <div className="text-sm text-slate-500">{company.slug}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {company.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Tracked sources</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {company.sources.map((source) => (
                <Badge key={source.id} tone="neutral">
                  {source.sourceType} / {source.sourceIdentifier}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Quick links</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {safeExternalUrl(company.careersUrl) ? (
                <Button asChild>
                  <a href={safeExternalUrl(company.careersUrl)!} target="_blank" rel="noopener noreferrer">
                    Careers page
                  </a>
                </Button>
              ) : null}
              {safeExternalUrl(company.websiteUrl) ? (
                <Button asChild variant="secondary">
                  <a href={safeExternalUrl(company.websiteUrl)!} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function CompaniesPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedPage = parseCompaniesPage(resolvedSearchParams.page);
  const { companies, total, page, totalPages } = await getCompaniesOverviewPage(requestedPage);

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        title="Tracked companies"
      />

      {companies.length === 0 ? (
        <EmptyState
          title="No tracked companies yet"
          description="Seed active company sources and run ingestion to populate the tracked-company list."
        />
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-500">
            {total} tracked companies with active sources. Showing page {page} of {totalPages}.
          </div>

          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}

          <nav aria-label="Company pages" className="flex items-center justify-between border-t border-slate-200 pt-6">
            {page > 1 ? (
              <Button asChild variant="secondary">
                <Link href={pageHref(resolvedSearchParams, page - 1)} rel="prev">
                  Previous
                </Link>
              </Button>
            ) : (
              <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                Previous
              </span>
            )}
            <span aria-current="page" className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Button asChild variant="secondary">
                <Link href={pageHref(resolvedSearchParams, page + 1)} rel="next">
                  Next
                </Link>
              </Button>
            ) : (
              <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                Next
              </span>
            )}
          </nav>
        </div>
      )}
    </Container>
  );
}
