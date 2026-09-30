"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResult = {
  error?: string;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  missingTranscripts?: number;
};

export default function RefreshButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  async function refresh() {
    setPending(true);
    setStatus("");
    try {
      const response = await fetch("/callrecord/sync", { method: "POST", cache: "no-store" });
      const result = await response.json() as SyncResult;
      if (!response.ok) throw new Error(result.error || "Could not refresh calls");

      const inserted = result.inserted || 0;
      const updated = result.updated || 0;
      const unchanged = result.unchanged || 0;
      const missing = result.missingTranscripts || 0;
      setStatus(`Added ${inserted}, updated ${updated}, already saved ${unchanged}.${missing ? ` Vapi returned no transcript for ${missing}.` : ""}`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not refresh calls");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="records-refresh">
      <button className="button button-primary records-refresh-button" type="button" onClick={refresh} disabled={pending}>
        {pending ? "Refreshing…" : "Refresh from Vapi"}
      </button>
      <p className="records-refresh-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
