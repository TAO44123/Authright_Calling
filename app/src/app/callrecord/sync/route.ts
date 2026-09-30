import { saveCall } from "@/lib/calls";
import { callFromVapi, optionalString, record } from "@/lib/vapi-call";

export const runtime = "nodejs";

let syncInProgress = false;

async function vapiGet(path: string, key: string): Promise<unknown> {
  const baseUrl = process.env.VAPI_API_BASE_URL?.trim() || "https://api.vapi.ai";
  const url = new URL(path, baseUrl);
  const localHttp = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Vapi API URL must use HTTPS");
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Vapi rejected the private API key");
  }
  if (!response.ok) {
    throw new Error(`Vapi API returned HTTP ${response.status}`);
  }
  return response.json();
}

async function findPhoneNumberId(phoneNumber: string, key: string): Promise<string> {
  const search = new URLSearchParams({ search: phoneNumber, limit: "100" });
  const response = record(await vapiGet(`/v2/phone-number?${search}`, key));
  if (!Array.isArray(response.results)) throw new Error("Vapi phone number response was invalid");

  const match = response.results
    .map(record)
    .find((number) => number.number === phoneNumber);
  const id = optionalString(match?.id);
  if (!id) throw new Error("Configured phone number was not found in this Vapi account");
  return id;
}

export async function POST() {
  const key = process.env.VAPI_PRIVATE_API_KEY?.trim();
  const phoneNumber = process.env.VAPI_PHONE_NUMBER?.trim();
  if (!key) {
    return Response.json({ error: "Set VAPI_PRIVATE_API_KEY on the server to refresh from Vapi" }, { status: 503 });
  }
  if (!phoneNumber) {
    return Response.json({ error: "VAPI_PHONE_NUMBER is not configured" }, { status: 503 });
  }
  if (syncInProgress) {
    return Response.json({ error: "A refresh is already in progress" }, { status: 409 });
  }

  syncInProgress = true;
  try {
    const phoneNumberId = await findPhoneNumberId(phoneNumber, key);
    const params = new URLSearchParams({ phoneNumberId, limit: "100" });
    const response = await vapiGet(`/call?${params}`, key);
    if (!Array.isArray(response)) throw new Error("Vapi call list response was invalid");

    const calls = new Map<string, unknown>();
    for (const item of response) {
      const call = record(item);
      const id = optionalString(call.id);
      const ended = call.status === "ended" || Boolean(optionalString(call.endedAt));
      if (id && (call.type === "inboundPhoneCall" || !call.type) && ended) {
        calls.set(id, call);
      }
    }

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let missingTranscripts = 0;

    const items = [...calls.values()];
    for (let index = 0; index < items.length; index += 5) {
      const batch = await Promise.all(items.slice(index, index + 5).map(async (item) => {
        let call = callFromVapi(item);
        if (call && !call.transcript) {
          try {
            const detail = await vapiGet(`/call/${encodeURIComponent(call.callId)}`, key);
            call = callFromVapi(detail) || call;
          } catch (error) {
            console.warn("Could not fetch Vapi call details", call.callId, error);
          }
        }
        return call;
      }));

      for (const call of batch) {
        if (!call) continue;
        if (!call.transcript) missingTranscripts++;
        const result = saveCall(call);
        if (result === "inserted") inserted++;
        else if (result === "updated") updated++;
        else unchanged++;
      }
    }

    return Response.json({ ok: true, checked: calls.size, inserted, updated, unchanged, missingTranscripts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not refresh calls from Vapi";
    console.error("Vapi call refresh failed", message);
    return Response.json({ error: message }, { status: 502 });
  } finally {
    syncInProgress = false;
  }
}
