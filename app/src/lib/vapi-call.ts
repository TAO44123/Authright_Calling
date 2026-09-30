import type { SavedCall } from "@/lib/calls";

export type JsonRecord = Record<string, unknown>;

export function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

export function callFromVapi(callValue: unknown, messageValue?: unknown): SavedCall | null {
  const call = record(callValue);
  const message = record(messageValue);
  const callId = optionalString(call.id);
  if (!callId || callId.length > 128) return null;

  const messageCustomer = record(message.customer);
  const callCustomer = record(call.customer);
  const transcript = transcriptFrom(record(message.artifact))
    || transcriptFrom(record(call.artifact))
    || transcriptFrom({ messages: call.messages });

  return {
    callId,
    callerNumber: optionalString(messageCustomer.number) || optionalString(callCustomer.number),
    startedAt: optionalString(call.startedAt) || optionalString(message.startedAt) || optionalString(call.createdAt),
    endedAt: optionalString(call.endedAt) || optionalString(message.endedAt),
    endedReason: optionalString(message.endedReason) || optionalString(call.endedReason),
    transcript,
  };
}
