import { Badge, Button, Card, CardContent, Container, EmptyState, PageHeader } from "@faang-quant/ui";
import { getCompaniesOverview } from "../../lib/queries";
import { safeExternalUrl } from "../../lib/validation";

export default async function CompaniesPage() {
  const companies = await getCompaniesOverview();

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
            {companies.length} tracked companies with active sources.
          </div>

          {companies.map((company) => (
            <Card key={company.id}>
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
          ))}
        </div>
      )}
    </Container>
  );
}
