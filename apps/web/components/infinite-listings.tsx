"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApplicationState } from "@swe-quant/db";
import type { FeedListing } from "../lib/queries";
import { ListingCard } from "./listing-card";

type ListingsBatchResponse = {
  listings: FeedListing[];
  total: number;
  nextOffset: number;
  hasMore: boolean;
  favoriteIds?: string[];
  listIds?: string[];
  applicationStates?: Record<string, ApplicationState>;
};

export function InfiniteListings({
  initialListings,
  total,
  batchSize,
  queryString,
  listHref,
  favoriteIds: initialFavoriteIds,
  listIds: initialListIds,
  applicationStates: initialApplicationStates
}: {
  initialListings: FeedListing[];
  total: number;
  batchSize: number;
  queryString: string;
  listHref: string;
  favoriteIds: string[];
  listIds: string[];
  applicationStates: Record<string, ApplicationState>;
}) {
  const [listings, setListings] = useState(initialListings);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(initialFavoriteIds));
  const [listIds, setListIds] = useState(() => new Set(initialListIds));
  const [applicationStates, setApplicationStates] = useState(initialApplicationStates);
  const [nextOffset, setNextOffset] = useState(initialListings.length);
  const [hasMore, setHasMore] = useState(initialListings.length < total);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const queryKey = useMemo(
    () => `${queryString}|${batchSize}|${total}|${initialListings.map((listing) => listing.id).join(",")}`,
    [batchSize, initialListings, queryString, total]
  );

  useEffect(() => {
    setListings(initialListings);
    setFavoriteIds(new Set(initialFavoriteIds));
    setListIds(new Set(initialListIds));
    setApplicationStates(initialApplicationStates);
    setNextOffset(initialListings.length);
    setHasMore(initialListings.length < total);
    setIsLoading(false);
    loadingRef.current = false;
    setErrorText(null);
  }, [initialApplicationStates, initialFavoriteIds, initialListIds, initialListings, queryKey, total]);

  const loadNextBatch = useCallback(async () => {
    if (!hasMore || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
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

      setListings((current) => {
        const knownIds = new Set(current.map((listing) => listing.id));
        return [...current, ...batch.listings.filter((listing) => !knownIds.has(listing.id))];
      });
      setNextOffset(batch.nextOffset);
      setHasMore(batch.hasMore);

      if (batch.favoriteIds) {
        setFavoriteIds((current) => new Set([...current, ...batch.favoriteIds!]));
      }

      if (batch.listIds) {
        setListIds((current) => new Set([...current, ...batch.listIds!]));
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
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [batchSize, hasMore, nextOffset, queryString]);

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
            isListed={listIds.has(listing.id)}
            applicationState={applicationStates[listing.id] as ApplicationState | undefined}
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
