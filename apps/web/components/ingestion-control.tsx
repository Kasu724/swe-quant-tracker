"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@swe-quant/ui";
import type { IngestionStatus } from "../lib/ingestion-control";

const initialStatus: IngestionStatus = {
  phase: "idle",
  running: false,
  totalSources: 0,
  completedSources: 0,
  activeSources: [],
  discovered: 0,
  failedSources: 0,
  partialSources: 0,
  startedAt: null,
  finishedAt: null,
  error: null
};

export function IngestionControl({ compact = true }: { compact?: boolean }) {
  const [status, setStatus] = useState(initialStatus);
  const [requestPending, setRequestPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/ingestion", { cache: "no-store" });
      const body = (await response.json()) as IngestionStatus & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not read ingestion status.");
      setStatus(body);
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not read ingestion status.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), status.running ? 750 : 10_000);
    return () => window.clearInterval(interval);
  }, [refresh, status.running]);

  async function runNow() {
    setRequestPending(true);
    setRequestError(null);
    try {
      const response = await fetch("/api/ingestion", { method: "POST" });
      const body = (await response.json()) as IngestionStatus & { error?: string };
      if (!response.ok && response.status !== 409) throw new Error(body.error ?? "Could not start ingestion.");
      setStatus(body);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not start ingestion.");
    } finally {
      setRequestPending(false);
    }
  }

  const hasTotal = status.totalSources > 0;
  const percent = hasTotal
    ? Math.min(100, Math.round((status.completedSources / status.totalSources) * 100))
    : status.running ? 8 : status.phase === "completed" ? 100 : 0;
  const detail = status.running
    ? hasTotal
      ? `${status.completedSources} of ${status.totalSources} sources · ${status.discovered} new jobs`
      : "Preparing sources…"
    : status.phase === "completed"
      ? `Last run complete · ${status.discovered} new jobs`
      : status.phase === "failed"
        ? status.error ?? "The last ingestion failed."
        : "Ready to refresh internship data";

  return (
    <div
      className={
        compact
          ? "border-t border-slate-100 bg-white/88 px-4 py-2 sm:px-6 lg:px-8"
          : "flex w-[28rem] max-w-full items-center"
      }
    >
      <div className="flex w-full items-center gap-3">
        <Button
          type="button"
          variant={compact ? "secondary" : "primary"}
          className={compact ? "h-9 shrink-0" : "shrink-0"}
          disabled={status.running || requestPending}
          onClick={() => void runNow()}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${status.running ? "animate-spin" : ""}`} aria-hidden="true" />
          {status.running ? "Ingesting…" : requestPending ? "Starting…" : "Run ingestion now"}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="truncate" role="status" aria-live="polite">{requestError ?? detail}</span>
            <span className="shrink-0 tabular-nums">{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div
              className={`h-full rounded-full bg-brand-600 transition-[width] duration-500 ${status.running && !hasTotal ? "animate-pulse" : ""}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {!compact && status.activeSources.length > 0 ? (
            <p className="mt-2 min-w-0 truncate text-xs text-slate-500">
              Working on {status.activeSources.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
