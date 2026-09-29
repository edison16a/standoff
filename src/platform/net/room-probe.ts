import type { ProbeFailure } from "@/platform/protocol";
import { askFresh } from "./ask-fresh";
import { preferStream } from "./transport-choice";

/** Longer than the relay's own wait for the echo, so the relay's answer normally comes first. */
const PROBE_TIMEOUT_MS = 5000;
const NONCE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * `timeout` means no answer came in time, `transport` that the connection
 * closed first. Both may be a blip, where the relay's own answers are
 * about the room itself.
 */
export type ProbeOutcome = { ok: true } | { ok: false; reason: ProbeFailure | "timeout" | "transport" };

export interface ProbeOptions {
  /**
   * Use the HTTP stream. Pass the transport the caller's own connection
   * uses, which is known to work here. By default a WebSocket, unless
   * those are blocked on this page.
   */
  stream?: boolean;
  timeoutMs?: number;
  /** The check's nonce, so a host can tell it answered this one itself. */
  nonce?: string;
}

/**
 * Checks a room the way a phone would reach it: over a fresh connection,
 * which on Vercel may land on any server instance. The relay answers once
 * the host has echoed, and then closes the connection itself. A WebSocket
 * that never opens is tried once more over the stream, within the same
 * time, so a browser that cannot use WebSockets never fails a check for it.
 */
export async function probeRoom(room: { code: string; token: string }, options: ProbeOptions = {}): Promise<ProbeOutcome> {
  const { stream = preferStream(), timeoutMs = PROBE_TIMEOUT_MS, nonce = makeNonce() } = options;
  const message = { type: "probe:room", code: room.code, token: room.token, nonce } as const;
  const result = await askFresh(
    message,
    (reply): ProbeOutcome | null => {
      if (reply.type !== "probe:result" || reply.nonce !== nonce) return null;
      return reply.ok ? { ok: true } : { ok: false, reason: reply.reason ?? "no-echo" };
    },
    { stream, timeoutMs },
  );
  return typeof result === "string" ? { ok: false, reason: result } : result;
}

/**
 * True when a failed check is about the room itself, which no second look
 * will change. Where each server instance keeps its own rooms, "not found"
 * may only mean the check landed on another instance, as a phone's join
 * can, and a phone tries again too. So there it is only a strike.
 */
export function definitive(reason: string, shared: boolean): boolean {
  return reason === "closed" || reason === "moved" || (shared && reason === "not-found");
}

/** 24 random characters from the set the relay accepts. */
export function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => NONCE_CHARS[byte % NONCE_CHARS.length]).join("");
}
