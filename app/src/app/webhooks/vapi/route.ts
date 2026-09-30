import { timingSafeEqual } from "node:crypto";
import { saveCall } from "@/lib/calls";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validSecret(actual: string | null, expected: string): boolean {
  if (!actual || !expected) return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function transcriptFrom(artifact: JsonRecord): string {
  const transcript = optionalString(artifact.transcript);
  if (transcript) return transcript;

  if (!Array.isArray(artifact.messages)) return "";
  return artifact.messages
    .map((item) => {
      const entry = record(item);
      const text = optionalString(entry.message);
      if (!text || (entry.role !== "assistant" && entry.role !== "user")) return null;
      return (entry.role === "assistant" ? "AI" : "Caller") + ": " + text;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export async function POST(request: Request) {
  const expectedSecret = process.env.VAPI_WEBHOOK_SECRET?.trim() || "";
  if (!expectedSecret) {
    return Response.json({ error: "Webhook secret is not configured" }, { status: 503 });
  }
  if (!validSecret(request.headers.get("x-vapi-secret"), expectedSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    const body = await request.text();
    if (body.length > 2_000_000) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = record(record(payload).message);
  if (message.type !== "end-of-call-report") {
    return Response.json({ ok: true, ignored: true });
  }

  const call = record(message.call);
  const callId = optionalString(call.id);
  if (!callId || callId.length > 128) {
    return Response.json({ error: "Missing call ID" }, { status: 400 });
  }

  const artifact = record(message.artifact);
  const customer = record(message.customer);
  const callCustomer = record(call.customer);
  try {
    saveCall({
      callId,
      callerNumber: optionalString(customer.number) || optionalString(callCustomer.number),
      startedAt: optionalString(call.startedAt) || optionalString(message.startedAt),
      endedAt: optionalString(call.endedAt) || optionalString(message.endedAt),
      endedReason: optionalString(message.endedReason) || optionalString(call.endedReason),
      transcript: transcriptFrom(artifact),
    });
    return Response.json({ ok: true, callId });
  } catch (error) {
    console.error("Could not save Vapi call", callId, error);
    return Response.json({ error: "Could not save call" }, { status: 500 });
  }
}
