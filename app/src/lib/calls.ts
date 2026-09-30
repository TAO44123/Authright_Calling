import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type SavedCall = {
  callId: string;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  transcript: string;
};

function databasePath() {
  return path.resolve(process.cwd(), process.env.CALLS_DB_PATH || "./data/calls.sqlite");
}

export function saveCall(call: SavedCall) {
  const filePath = databasePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS calls (
        vapi_call_id TEXT PRIMARY KEY,
        started_at TEXT,
        ended_at TEXT,
        ended_reason TEXT,
        transcript TEXT NOT NULL DEFAULT '',
        transcript_status TEXT NOT NULL,
        received_at TEXT NOT NULL
      )
    `);

    const status = call.transcript ? "available" : "missing";
    db.prepare(`
      INSERT INTO calls (
        vapi_call_id, started_at, ended_at, ended_reason,
        transcript, transcript_status, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(vapi_call_id) DO UPDATE SET
        started_at = COALESCE(excluded.started_at, calls.started_at),
        ended_at = COALESCE(excluded.ended_at, calls.ended_at),
        ended_reason = COALESCE(excluded.ended_reason, calls.ended_reason),
        transcript = CASE WHEN excluded.transcript <> '' THEN excluded.transcript ELSE calls.transcript END,
        transcript_status = CASE WHEN excluded.transcript <> '' THEN 'available' ELSE calls.transcript_status END,
        received_at = excluded.received_at
    `).run(
      call.callId,
      call.startedAt,
      call.endedAt,
      call.endedReason,
      call.transcript,
      status,
      new Date().toISOString(),
    );
  } finally {
    db.close();
  }
}
