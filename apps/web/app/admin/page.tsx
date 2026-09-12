import {
  DEFAULT_INGESTION_INTERVAL_MINUTES,
  INGESTION_INTERVAL_OPTIONS
} from "@swe-quant/db";
import { Badge, Button, Card, CardContent, Container, Input, PageHeader, Select } from "@swe-quant/ui";
import {
  createCompanySourceAction,
  mergeDuplicatePostingsAction,
  toggleCompanyActiveAction,
  toggleSourceActiveAction,
  updateIngestionScheduleAction
} from "../../lib/actions";
import { IngestionControl } from "../../components/ingestion-control";
import { LocalDateTime } from "../../components/local-date-time";
import { getAdminDashboardData } from "../../lib/queries";

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  return (
    <Container className="space-y-10 py-12">
      <PageHeader
        title="Ingestion and source operations"
        actions={<IngestionControl compact={false} />}
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-500">Recent runs</div>
            <div className="text-3xl font-semibold">{data.runs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-500">New postings this week</div>
            <div className="text-3xl font-semibold">{data.newPostings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-500">Saved searches with alerts</div>
            <div className="text-3xl font-semibold">{data.searches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-500">Would send now</div>
            <div className="text-3xl font-semibold">{data.alertPreviewCount}</div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Automatic ingestion</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose how often active sources are checked. The next run is shown in this device&apos;s local time.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <form action={updateIngestionScheduleAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor="ingestion-interval">
                Run every
                <Select
                  id="ingestion-interval"
                  name="intervalMinutes"
                  defaultValue={String(data.ingestionSchedule.intervalMinutes || DEFAULT_INGESTION_INTERVAL_MINUTES)}
                  className="min-w-48"
                >
                  {INGESTION_INTERVAL_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes < 60 ? `${minutes} minutes` : minutes === 60 ? "1 hour" : `${minutes / 60} hours`}
                    </option>
                  ))}
                </Select>
              </label>
              <Button type="submit">Save frequency</Button>
            </form>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <div className="text-slate-500">Next ingestion</div>
              <div className="mt-1 font-semibold text-slate-900">
                <LocalDateTime value={data.ingestionSchedule.nextRunAt.toISOString()} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Recent ingestion runs</h2>
        <div className="grid gap-4">
          {data.runs.map((run) => (
            <Card key={run.id}>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={run.status === "SUCCESS" ? "success" : run.status === "FAILED" ? "warning" : "neutral"}>
                    {run.status}
                  </Badge>
                  <Badge>{run.sourceType}</Badge>
                </div>
                <div className="text-sm text-slate-600">
                  {run.companySource?.company.name ?? "Global"} · {run.startedAt.toLocaleString()}
                </div>
                {run.errorText ? <div className="text-sm text-rose-600">{run.errorText}</div> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Potential duplicate merges</h2>
        {data.potentialDuplicates.length === 0 ? (
          <Card><CardContent>No duplicate clusters detected in the recent sample.</CardContent></Card>
        ) : (
          data.potentialDuplicates.map((cluster) => (
            <Card key={cluster[0].dedupeFingerprint}>
              <CardContent className="space-y-4">
                {cluster.map((posting) => (
                  <div key={posting.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-900">{posting.title}</div>
                    <div>{posting.companyNameSnapshot}</div>
                    <div>ID: {posting.id}</div>
                  </div>
                ))}
                <form action={mergeDuplicatePostingsAction} className="grid gap-3 md:grid-cols-3">
                  <Input name="sourcePostingId" placeholder="Source posting ID" />
                  <Input name="targetPostingId" placeholder="Target posting ID" />
                  <Button type="submit">Merge cluster</Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Tracked companies</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {data.companies.map((company) => (
            <Card key={company.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{company.name}</div>
                    <div className="text-sm text-slate-500">{company._count.sources} sources · {company._count.postings} postings</div>
                  </div>
                  <form action={toggleCompanyActiveAction}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <input type="hidden" name="isActive" value={company.isActive ? "false" : "true"} />
                    <Button variant="secondary" type="submit">
                      {company.isActive ? "Disable" : "Enable"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Configured sources</h2>
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-slate-900">Add a new source</h3>
            <form action={createCompanySourceAction} className="grid gap-3 md:grid-cols-5">
              <Select name="companyId" defaultValue="">
                <option value="" disabled>
                  Company
                </option>
                {data.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
              <Select name="sourceType" defaultValue="GREENHOUSE">
                <option value="GREENHOUSE">Greenhouse</option>
                <option value="LEVER">Lever</option>
                <option value="ASHBY">Ashby</option>
                <option value="WORKDAY">Workday</option>
                <option value="CUSTOM_API">Custom API</option>
                <option value="CUSTOM_HTML">Custom HTML</option>
              </Select>
              <Input name="sourceIdentifier" placeholder="board token" />
              <Input name="sourceUrl" placeholder="source URL" />
              <Input name="priority" type="number" defaultValue={100} />
              <Input name="sourceName" placeholder="display name" className="md:col-span-4" />
              <Button type="submit">Create source</Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {data.sources.map((source) => (
            <Card key={source.id}>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    {source.company.name} · {source.sourceType}
                  </div>
                  <div className="text-sm text-slate-600">
                    {source.sourceIdentifier} · priority {source.priority}
                  </div>
                </div>
                <form action={toggleSourceActiveAction} className="flex gap-3">
                  <input type="hidden" name="sourceId" value={source.id} />
                  <input type="hidden" name="isActive" value={source.isActive ? "false" : "true"} />
                  <input
                    type="hidden"
                    name="pollingEnabled"
                    value={source.pollingEnabled ? "false" : "true"}
                  />
                  <Button variant="secondary" type="submit">
                    {source.isActive ? "Disable source" : "Enable source"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
