import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type SavedCall = {
  callId: string;
  callerNumber: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  transcript: string;
};

export type CallRecord = SavedCall & {
  transcriptStatus: string;
  receivedAt: string;
};

function databasePath() {
  return path.resolve(process.cwd(), process.env.CALLS_DB_PATH || "./data/calls.sqlite");
}

export function saveCall(call: SavedCall): "inserted" | "updated" | "unchanged" {
  const filePath = databasePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS calls (
        vapi_call_id TEXT PRIMARY KEY,
        caller_number TEXT,
        started_at TEXT,
        ended_at TEXT,
        ended_reason TEXT,
        transcript TEXT NOT NULL DEFAULT '',
        transcript_status TEXT NOT NULL,
        received_at TEXT NOT NULL
      )
    `);

    const columns = db.prepare("PRAGMA table_info(calls)").all() as { name: string }[];
    if (!columns.some((column) => column.name === "caller_number")) {
      db.exec("ALTER TABLE calls ADD COLUMN caller_number TEXT");
    }

    const exists = Boolean(db.prepare("SELECT 1 FROM calls WHERE vapi_call_id = ?").get(call.callId));
    const status = call.transcript ? "available" : "missing";
    const result = db.prepare(`
      INSERT INTO calls (
        vapi_call_id, caller_number, started_at, ended_at, ended_reason,
        transcript, transcript_status, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(vapi_call_id) DO UPDATE SET
        caller_number = COALESCE(excluded.caller_number, calls.caller_number),
        started_at = COALESCE(excluded.started_at, calls.started_at),
        ended_at = COALESCE(excluded.ended_at, calls.ended_at),
        ended_reason = COALESCE(excluded.ended_reason, calls.ended_reason),
        transcript = CASE WHEN excluded.transcript <> '' THEN excluded.transcript ELSE calls.transcript END,
        transcript_status = CASE WHEN excluded.transcript <> '' THEN 'available' ELSE calls.transcript_status END
      WHERE (excluded.caller_number IS NOT NULL AND excluded.caller_number IS NOT calls.caller_number)
         OR (excluded.started_at IS NOT NULL AND excluded.started_at IS NOT calls.started_at)
         OR (excluded.ended_at IS NOT NULL AND excluded.ended_at IS NOT calls.ended_at)
         OR (excluded.ended_reason IS NOT NULL AND excluded.ended_reason IS NOT calls.ended_reason)
         OR (excluded.transcript <> '' AND excluded.transcript IS NOT calls.transcript)
    `).run(
      call.callId,
      call.callerNumber,
      call.startedAt,
      call.endedAt,
      call.endedReason,
      call.transcript,
      status,
      new Date().toISOString(),
    );

    return Number(result.changes) === 0 ? "unchanged" : exists ? "updated" : "inserted";
  } finally {
    db.close();
  }
}

export function listCalls(limit = 100): CallRecord[] {
  const filePath = databasePath();
  if (!existsSync(filePath)) return [];

  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'calls'").get();
    if (!table) return [];

    const columns = db.prepare("PRAGMA table_info(calls)").all() as { name: string }[];
    const callerColumn = columns.some((column) => column.name === "caller_number")
      ? "caller_number AS callerNumber"
      : "NULL AS callerNumber";

    return db.prepare(`
      SELECT vapi_call_id AS callId, ${callerColumn},
        started_at AS startedAt, ended_at AS endedAt,
        ended_reason AS endedReason, transcript,
        transcript_status AS transcriptStatus, received_at AS receivedAt
      FROM calls ORDER BY COALESCE(started_at, received_at) DESC LIMIT ?
    `).all(Math.max(1, Math.min(limit, 100))) as unknown as CallRecord[];
  } finally {
    db.close();
  }
}
