"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApplicationState } from "@faang-quant/db";
import type { FeedListing } from "../lib/queries";
import { ListingCard } from "./listing-card";

type ListingsBatchResponse = {
  listings: FeedListing[];
  total: number;
  nextOffset: number;
  hasMore: boolean;
  favoriteIds?: string[];
  applicationStates?: Record<string, ApplicationState>;
};

export function InfiniteListings({
  initialListings,
  total,
  batchSize,
  queryString,
  listHref,
  showPersonalActions,
  favoriteIds: initialFavoriteIds,
  applicationStates: initialApplicationStates
}: {
  initialListings: FeedListing[];
  total: number;
  batchSize: number;
  queryString: string;
  listHref: string;
  showPersonalActions: boolean;
  favoriteIds: string[];
  applicationStates: Record<string, ApplicationState>;
}) {
  const [listings, setListings] = useState(initialListings);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(initialFavoriteIds));
  const [applicationStates, setApplicationStates] = useState(initialApplicationStates);
  const [nextOffset, setNextOffset] = useState(initialListings.length);
  const [hasMore, setHasMore] = useState(initialListings.length < total);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryKey = useMemo(
    () => `${queryString}|${batchSize}|${total}|${initialListings.map((listing) => listing.id).join(",")}`,
    [batchSize, initialListings, queryString, total]
  );

  useEffect(() => {
    setListings(initialListings);
    setFavoriteIds(new Set(initialFavoriteIds));
    setApplicationStates(initialApplicationStates);
    setNextOffset(initialListings.length);
    setHasMore(initialListings.length < total);
    setIsLoading(false);
    setErrorText(null);
  }, [initialApplicationStates, initialFavoriteIds, initialListings, queryKey, total]);

  const loadNextBatch = useCallback(async () => {
    if (!hasMore || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorText(null);

    try {
      const params = new URLSearchParams(queryString);

      params.set("offset", String(nextOffset));
      params.set("limit", String(batchSize));

      const response = await fetch(`/api/internships?${params.toString()}`, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Unable to load more internships.");
      }

      const batch = (await response.json()) as ListingsBatchResponse;

      setListings((current) => [...current, ...batch.listings]);
      setNextOffset(batch.nextOffset);
      setHasMore(batch.hasMore);

      if (batch.favoriteIds) {
        setFavoriteIds((current) => new Set([...current, ...batch.favoriteIds!]));
      }

      if (batch.applicationStates) {
        setApplicationStates((current) => ({
          ...current,
          ...batch.applicationStates
        }));
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unable to load more internships.");
    } finally {
      setIsLoading(false);
    }
  }, [batchSize, hasMore, isLoading, nextOffset, queryString]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadNextBatch();
        }
      },
      {
        rootMargin: "900px 0px"
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadNextBatch]);

  return (
    <>
      <div className="text-sm text-slate-500">
        {total} internships matched your filters. Showing {listings.length} of {total}.
      </div>
      <div className="space-y-4">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            posting={listing}
            isFavorite={favoriteIds.has(listing.id)}
            applicationState={applicationStates[listing.id] as ApplicationState | undefined}
            showPersonalActions={showPersonalActions}
            redirectTo={listHref}
          />
        ))}
        {errorText ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {errorText}
            <button
              type="button"
              className="ml-3 font-semibold text-brand-700"
              onClick={() => void loadNextBatch()}
            >
              Try again
            </button>
          </div>
        ) : null}
        <div ref={sentinelRef} className="h-8" aria-hidden="true" />
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
            Loading more internships...
          </div>
        ) : null}
        {!hasMore && listings.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
            End of results
          </div>
        ) : null}
      </div>
    </>
  );
}
