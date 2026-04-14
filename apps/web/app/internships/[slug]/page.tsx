import { notFound } from "next/navigation";
import { Badge, Button, Card, CardContent, Container, PageHeader } from "@faang-quant/ui";
import { toggleFavoriteAction, updateApplicationStateAction } from "../../../lib/actions";
import { getCurrentSession } from "../../../lib/auth";
import { getInternshipBySlug } from "../../../lib/queries";

export default async function InternshipDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getCurrentSession();
  const result = await getInternshipBySlug(slug, session?.user?.id);

  if (!result) {
    notFound();
  }

  const { posting, favorite, applicationState } = result;

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        eyebrow="Internship Detail"
        title={posting.title}
        description={`${posting.companyNameSnapshot} · ${posting.locationRaw ?? "Location not listed"} · ${posting.remoteType}`}
        actions={
          <Button asChild>
            <a href={posting.applicationUrl} target="_blank" rel="noreferrer">
              Apply now
            </a>
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{posting.company.companyBucket.replaceAll("_", " ")}</Badge>
                <Badge tone="neutral">{posting.roleCategory.replaceAll("_", " ")}</Badge>
                <Badge tone="neutral">{posting.sourceName}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Season / Year</div>
                  <div className="text-sm text-slate-600">
                    {posting.season ?? "TBD"} {posting.year ?? ""}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Compensation</div>
                  <div className="text-sm text-slate-600">
                    {posting.payRaw ?? "Not disclosed"}
                  </div>
                </div>
              </div>
              {posting.descriptionRaw ? (
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: posting.descriptionRaw }}
                />
              ) : (
                <p className="text-sm text-slate-600">{posting.descriptionText ?? "No description provided."}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-display text-2xl font-semibold">Source records</h2>
              <div className="space-y-3">
                {posting.sourceRecords.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-900">
                      {record.companySource.sourceName} · {record.companySource.sourceType}
                    </div>
                    <div>{record.sourceUrl ?? record.applicationUrl}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Last seen {record.lastSeenAt.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-500">Personal actions</div>
              <form action={toggleFavoriteAction}>
                <input type="hidden" name="postingId" value={posting.id} />
                <input type="hidden" name="redirectTo" value={`/internships/${posting.slug}`} />
                <Button variant="secondary" type="submit" className="w-full">
                  {favorite ? "Remove favorite" : "Favorite internship"}
                </Button>
              </form>
              <form action={updateApplicationStateAction}>
                <input type="hidden" name="postingId" value={posting.id} />
                <input type="hidden" name="redirectTo" value={`/internships/${posting.slug}`} />
                <input
                  type="hidden"
                  name="state"
                  value={applicationState?.state === "APPLIED" ? "NONE" : "APPLIED"}
                />
                <Button variant="secondary" type="submit" className="w-full">
                  {applicationState?.state === "APPLIED" ? "Undo applied" : "Mark applied"}
                </Button>
              </form>
              <form action={updateApplicationStateAction}>
                <input type="hidden" name="postingId" value={posting.id} />
                <input type="hidden" name="redirectTo" value={`/internships/${posting.slug}`} />
                <input
                  type="hidden"
                  name="state"
                  value={applicationState?.state === "HIDDEN" ? "NONE" : "HIDDEN"}
                />
                <Button variant="ghost" type="submit" className="w-full">
                  {applicationState?.state === "HIDDEN" ? "Unhide" : "Hide"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}

