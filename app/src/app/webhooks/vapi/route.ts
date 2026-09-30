import { timingSafeEqual } from "node:crypto";
import { saveCall } from "@/lib/calls";
import { callFromVapi, record } from "@/lib/vapi-call";

export const runtime = "nodejs";

function validSecret(actual: string | null, expected: string): boolean {
  if (!actual || !expected) return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
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

  const call = callFromVapi(message.call, message);
  if (!call) {
    return Response.json({ error: "Missing call ID" }, { status: 400 });
  }

  try {
    saveCall(call);
    return Response.json({ ok: true, callId: call.callId });
  } catch (error) {
    console.error("Could not save Vapi call", call.callId, error);
    return Response.json({ error: "Could not save call" }, { status: 500 });
  }
}
