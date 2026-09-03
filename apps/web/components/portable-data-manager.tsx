"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@swe-quant/ui";
import { useRouter } from "next/navigation";

type ImportResponse = {
  error?: string;
  result?: {
    savedSearches: number;
    companies: number;
    restoredJobs: number;
    unresolvedJobs: number;
    theme: "light" | "dark" | "system";
  };
};

export function PortableDataManager() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [replacePersonalData, setReplacePersonalData] = useState(false);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function exportData() {
    setBusy("export");
    setMessage(null);
    try {
      const theme = window.localStorage.getItem("theme") ?? "system";
      const response = await fetch(`/api/portable-data/export?theme=${encodeURIComponent(theme)}`);
      if (!response.ok) throw new Error("Could not create the backup.");
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? "swe-quant-tracker-backup.json";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Backup downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the backup.");
    } finally {
      setBusy(null);
    }
  }

  async function importData() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setMessage("Choose a tracker backup file first.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Backup files must be smaller than 5 MB.");
      return;
    }

    setBusy("import");
    setMessage(null);
    try {
      const data: unknown = JSON.parse(await file.text());
      const response = await fetch("/api/portable-data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, replacePersonalData })
      });
      const payload = (await response.json()) as ImportResponse;
      if (!response.ok || !payload.result) throw new Error(payload.error ?? "The backup could not be imported.");

      if (payload.result.theme === "light" || payload.result.theme === "dark") {
        window.localStorage.setItem("theme", payload.result.theme);
        document.documentElement.classList.toggle("dark", payload.result.theme === "dark");
        document.documentElement.style.colorScheme = payload.result.theme;
      } else {
        window.localStorage.removeItem("theme");
      }

      setMessage(
        `Imported ${payload.result.savedSearches} saved searches, ${payload.result.companies} companies, and ${payload.result.restoredJobs} saved jobs` +
          (payload.result.unresolvedJobs ? `. ${payload.result.unresolvedJobs} jobs are not in this machine's current ingestion data yet.` : ".")
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The backup could not be imported.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void exportData()} disabled={busy !== null}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {busy === "export" ? "Creating backup…" : "Export backup"}
        </Button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="block max-w-full text-sm text-slate-600" />
        <Button type="button" variant="secondary" onClick={() => void importData()} disabled={busy !== null}>
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          {busy === "import" ? "Importing…" : "Import backup"}
        </Button>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={replacePersonalData}
          onChange={(event) => setReplacePersonalData(event.target.checked)}
          className="mt-1"
        />
        Replace existing saved searches, favorites, application list, and application states before importing.
      </label>
      {message ? <p className="text-sm text-slate-600" role="status">{message}</p> : null}
    </div>
  );
}
