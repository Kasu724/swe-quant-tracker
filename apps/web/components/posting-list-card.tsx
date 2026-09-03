"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, Checkbox, cn } from "@swe-quant/ui";
import { getPreferredPostingUrl } from "@swe-quant/shared";
import type { PostingListItem } from "../lib/queries";
import { safeExternalUrl } from "../lib/validation";
import { IntentLink } from "./site-nav-link";

export function PostingListCard({ item }: { item: PostingListItem }) {
  const [isCompleted, setIsCompleted] = useState(item.isCompleted);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const outboundUrl = safeExternalUrl(getPreferredPostingUrl(item.posting));

  async function updateCompleted(nextCompleted: boolean) {
    if (isPending) {
      return;
    }

    setIsCompleted(nextCompleted);
    setIsPending(true);

    try {
      const response = await fetch("/api/list", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          postingId: item.posting.id,
          isCompleted: nextCompleted
        })
      });

      if (!response.ok) {
        throw new Error("Unable to update list item");
      }
    } catch {
      setIsCompleted(!nextCompleted);
    } finally {
      setIsPending(false);
    }
  }

  async function removeItem() {
    if (isPending) {
      return;
    }

    setIsRemoved(true);
    setIsPending(true);

    try {
      const response = await fetch("/api/list", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ postingId: item.posting.id })
      });

      if (!response.ok) {
        throw new Error("Unable to remove list item");
      }
    } catch {
      setIsRemoved(false);
    } finally {
      setIsPending(false);
    }
  }

  if (isRemoved) {
    return null;
  }

  return (
    <Card
      className={cn(
        "transition-[border-color,box-shadow,opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-brand-200 motion-safe:hover:shadow-lg",
        isCompleted && "bg-slate-50 opacity-60 grayscale"
      )}
    >
      <CardContent className="flex gap-4">
        <label className="mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center" title="Mark application complete">
          <Checkbox
            className="h-5 w-5"
            checked={isCompleted}
            disabled={isPending}
            aria-label={`Mark ${item.posting.title} complete`}
            onChange={(event) => void updateCompleted(event.target.checked)}
          />
        </label>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold text-brand-700">
                  {item.posting.companyNameSnapshot}
                </span>
                <Badge tone="brand" className="dark:bg-brand-900 dark:text-brand-100">
                  {item.posting.roleCategory.replaceAll("_", " ")}
                </Badge>
                {isCompleted ? (
                  <Badge tone="success">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Complete
                  </Badge>
                ) : null}
              </div>
              <IntentLink
                href={`/internships/${item.posting.slug}`}
                className={cn(
                  "block truncate font-display text-xl font-semibold text-ink hover:text-brand-700",
                  isCompleted && "line-through"
                )}
              >
                {item.posting.title}
              </IntentLink>
              <div className="text-sm text-slate-500">
                {item.posting.locationRaw ?? "Location not listed"} /{" "}
                {item.posting.remoteType}
              </div>
            </div>

            <div className="shrink-0 text-sm text-slate-500">
              Added {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {outboundUrl ? (
              <Button asChild>
                <a href={outboundUrl} target="_blank" rel="noopener noreferrer">
                  Apply
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            ) : null}
            <Button variant="secondary" asChild>
              <IntentLink href={`/internships/${item.posting.slug}`}>View details</IntentLink>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-10 p-0"
              aria-label={`Remove ${item.posting.title} from list`}
              title="Remove from list"
              disabled={isPending}
              onClick={() => void removeItem()}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
