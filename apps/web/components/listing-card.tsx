"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge, Button, Card, CardContent } from "@swe-quant/ui";
import type { ApplicationState } from "@swe-quant/db";
import { getPreferredPostingUrl } from "@swe-quant/shared/posting-links";
import type { FeedListing } from "../lib/queries";
import { toggleFavoriteAction, updateApplicationStateAction } from "../lib/actions";
import { PostingListButton } from "./posting-list-button";
import { IntentLink } from "./site-nav-link";
import { safeExternalUrl } from "../lib/validation";

export function ListingCard({
  posting,
  isFavorite,
  isListed,
  applicationState,
  redirectTo
}: {
  posting: FeedListing;
  isFavorite: boolean;
  isListed: boolean;
  applicationState?: ApplicationState | null;
  redirectTo: string;
}) {
  const discoveredAt = new Date(posting.discoveredAt);
  const postingDate = posting.postingDate ? new Date(posting.postingDate) : null;
  const compensation =
    posting.compensationMin || posting.compensationMax
      ? `${posting.compensationCurrency ?? "$"}${posting.compensationMin ?? "?"} - ${posting.compensationMax ?? posting.compensationMin ?? "?"}${posting.compensationInterval && posting.compensationInterval !== "UNKNOWN" ? ` / ${posting.compensationInterval.toLowerCase()}` : ""}`
      : "Pay unknown";

  const isNew = Date.now() - discoveredAt.getTime() < 1000 * 60 * 60 * 24 * 7;
  const outboundUrl = safeExternalUrl(getPreferredPostingUrl(posting));

  return (
    <Card className="rounded-xl transition-[border-color,background-color] duration-200 hover:border-brand-300 hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {posting.companyNameSnapshot}
              </div>
              <Badge tone="neutral">{posting.company.companyBucket.replaceAll("_", " ")}</Badge>
              <Badge tone="brand" className="dark:bg-brand-900 dark:text-brand-100">
                {posting.roleCategory.replaceAll("_", " ")}
              </Badge>
              {posting.internshipFlag ? <Badge tone="neutral">Internship</Badge> : null}
              {posting.newGradFlag ? <Badge tone="success">New grad</Badge> : null}
              <Badge tone="neutral">{posting.remoteType}</Badge>
              {isNew ? <Badge tone="success">New</Badge> : null}
            </div>
            <IntentLink
              href={`/internships/${posting.slug}`}
              className="block font-display text-xl font-semibold tracking-tight text-ink hover:text-brand-700"
            >
              {posting.title}
            </IntentLink>
            <div className="text-sm text-slate-500">
              {posting.locationRaw ?? "Location not listed"} / {posting.season ?? "Season TBD"}{" "}
              {posting.year ?? ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-500">
              First seen {formatDistanceToNow(discoveredAt, { addSuffix: true })}
            </div>
            <PostingListButton
              postingId={posting.id}
              initialListed={isListed}
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1 space-y-1 border-l-2 border-slate-200 pl-4 text-sm text-slate-600 dark:border-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Compensation:</span> {compensation}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Posting Date:</span>{" "}
              {postingDate ? postingDate.toLocaleDateString() : "Unknown"}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Source:</span> {posting.sourceName}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 md:justify-end">
            {outboundUrl ? (
              <Button asChild>
                <a href={outboundUrl} target="_blank" rel="noopener noreferrer">
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
        </div>
      </CardContent>
    </Card>
  );
}
