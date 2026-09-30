import type { Metadata } from "next";
import { connection } from "next/server";
import { listCalls } from "@/lib/calls";
import RefreshButton from "./refresh-button";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Call Records | Call Authright",
  description: "Incoming call records and saved transcripts.",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return "Unknown";
  const seconds = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export default async function CallRecordPage() {
  await connection();
  const calls = listCalls();

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand" aria-label="Call Authright">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>Call Authright</span>
          </div>
          <span className="header-tag">CALL LOG</span>
        </div>
      </header>

      <main className="records-main">
        <div className="records-heading">
          <p className="records-kicker">INCOMING CALLS</p>
          <div className="records-title-row">
            <h1>Call records</h1>
            <div className="records-actions">
              <span className="records-count">{calls.length === 100 ? "Latest 100 calls" : `${calls.length} ${calls.length === 1 ? "call" : "calls"}`}</span>
              <RefreshButton />
            </div>
          </div>
          <p>Review call details and the conversation saved after each call.</p>
        </div>

        {calls.length === 0 ? (
          <section className="records-empty" aria-label="No call records">
            <span className="records-empty-icon" aria-hidden="true">☎</span>
            <h2>No calls saved yet</h2>
            <p>Incoming calls will appear here after Vapi sends the end-of-call report.</p>
          </section>
        ) : (
          <div className="records-list">
            {calls.map((call) => {
              const callTime = call.startedAt || call.receivedAt;
              const hasTranscript = call.transcriptStatus === "available" && Boolean(call.transcript);
              return (
                <details className="record-card" key={call.callId}>
                  <summary className="record-summary">
                    <span className="record-summary-main">
                      <strong>{call.callerNumber || "Unknown caller"}</strong>
                      <time dateTime={callTime}>{formatDate(callTime)}</time>
                    </span>
                    <span className={hasTranscript ? "record-status record-status-ready" : "record-status"}>
                      {hasTranscript ? "Transcript saved" : "No transcript"}
                    </span>
                    <span className="record-chevron" aria-hidden="true" />
                  </summary>

                  <div className="record-details">
                    <dl className="record-meta">
                      <div><dt>Started</dt><dd>{formatDate(call.startedAt)}</dd></div>
                      <div><dt>Duration</dt><dd>{formatDuration(call.startedAt, call.endedAt)}</dd></div>
                      <div><dt>End reason</dt><dd>{call.endedReason || "Unknown"}</dd></div>
                      <div><dt>Call ID</dt><dd className="record-id">{call.callId}</dd></div>
                    </dl>
                    <div className="record-transcript-section">
                      <h2>Conversation transcript</h2>
                      <pre className="record-transcript">{call.transcript || "No transcript was included in this call report."}</pre>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
