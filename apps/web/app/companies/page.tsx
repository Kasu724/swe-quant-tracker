import { Badge, Card, CardContent, Container, PageHeader } from "@faang-quant/ui";
import { getCompaniesOverview } from "../../lib/queries";

export default async function CompaniesPage() {
  const companies = await getCompaniesOverview();

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        eyebrow="Coverage"
        title="Tracked companies"
        description="Every company in the tracked universe, along with current source coverage and stored posting counts."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-2xl font-semibold">{company.name}</div>
                  <div className="text-sm text-slate-500">{company.slug}</div>
                </div>
                <Badge tone="brand">{company.companyBucket.replaceAll("_", " ")}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {company.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">Sources</div>
                  <div>{company._count.sources}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">Stored postings</div>
                  <div>{company._count.postings}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                {company.sources.length === 0 ? (
                  <div>No source configured yet.</div>
                ) : (
                  company.sources.map((source) => (
                    <div key={source.id} className="rounded-2xl border border-slate-200 px-3 py-2">
                      {source.sourceType} · {source.sourceIdentifier}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}

