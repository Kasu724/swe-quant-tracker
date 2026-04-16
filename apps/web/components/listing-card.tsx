import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge, Button, Card, CardContent } from "@faang-quant/ui";
import type { InternshipPosting, ApplicationState } from "@faang-quant/db";
import { getPreferredPostingUrl } from "@faang-quant/shared";
import { toggleFavoriteAction, updateApplicationStateAction } from "../lib/actions";

export function ListingCard({
  posting,
  isFavorite,
  applicationState,
  redirectTo
}: {
  posting: InternshipPosting & { company: { name: string; slug: string; companyBucket: string } };
  isFavorite: boolean;
  applicationState?: ApplicationState | null;
  redirectTo: string;
}) {
  const compensation =
    posting.compensationMin || posting.compensationMax
      ? `${posting.compensationCurrency ?? "$"}${posting.compensationMin ?? "?"} - ${posting.compensationMax ?? posting.compensationMin ?? "?"}${posting.compensationInterval && posting.compensationInterval !== "UNKNOWN" ? ` / ${posting.compensationInterval.toLowerCase()}` : ""}`
      : "Pay unknown";

  const isNew = Date.now() - posting.discoveredAt.getTime() < 1000 * 60 * 60 * 24 * 7;
  const outboundUrl = getPreferredPostingUrl(posting);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-display text-2xl font-semibold tracking-tight text-brand-700">
                {posting.companyNameSnapshot}
              </div>
              <Badge tone="neutral">{posting.company.companyBucket.replaceAll("_", " ")}</Badge>
              <Badge tone="brand">{posting.roleCategory.replaceAll("_", " ")}</Badge>
              <Badge tone="neutral">{posting.remoteType}</Badge>
              {isNew ? <Badge tone="success">New</Badge> : null}
            </div>
            <Link
              href={`/internships/${posting.slug}`}
              className="block font-display text-xl font-semibold tracking-tight text-ink hover:text-brand-700"
            >
              {posting.title}
            </Link>
            <div className="text-sm text-slate-500">
              {posting.locationRaw ?? "Location not listed"} / {posting.season ?? "Season TBD"}{" "}
              {posting.year ?? ""}
            </div>
          </div>
          <div className="text-sm text-slate-500">
            Seen {formatDistanceToNow(posting.discoveredAt, { addSuffix: true })}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Compensation</div>
            <div>{compensation}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Posting Date</div>
            <div>{posting.postingDate ? posting.postingDate.toLocaleDateString() : "Unknown"}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Source</div>
            <div>{posting.sourceName}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {outboundUrl ? (
            <Button asChild>
              <a href={outboundUrl} target="_blank" rel="noreferrer">
                Apply
              </a>
            </Button>
          ) : null}
          <form action={toggleFavoriteAction}>
            <input type="hidden" name="postingId" value={posting.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Button variant="secondary" type="submit">
              {isFavorite ? "Remove favorite" : "Favorite"}
            </Button>
          </form>
          <form action={updateApplicationStateAction}>
            <input type="hidden" name="postingId" value={posting.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input
              type="hidden"
              name="state"
              value={applicationState === "APPLIED" ? "NONE" : "APPLIED"}
            />
            <Button variant="secondary" type="submit">
              {applicationState === "APPLIED" ? "Mark unapplied" : "Mark applied"}
            </Button>
          </form>
          <form action={updateApplicationStateAction}>
            <input type="hidden" name="postingId" value={posting.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input
              type="hidden"
              name="state"
              value={applicationState === "HIDDEN" ? "NONE" : "HIDDEN"}
            />
            <Button variant="ghost" type="submit">
              {applicationState === "HIDDEN" ? "Unhide" : "Hide"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
