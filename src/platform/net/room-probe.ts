import type { ProbeFailure } from "@/platform/protocol";
import { openChannel, readEnvelope } from "./open-channel";
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
  /** Use the HTTP stream. By default a WebSocket, unless one failed to open here a moment ago. */
  stream?: boolean;
  timeoutMs?: number;
}

/**
 * Checks a room the way a phone would reach it: over a fresh connection,
 * which on Vercel may land on any server instance. The relay answers once
 * the host has echoed, and then closes the connection itself.
 */
export function probeRoom(room: { code: string; token: string }, { stream = preferStream(), timeoutMs = PROBE_TIMEOUT_MS }: ProbeOptions = {}): Promise<ProbeOutcome> {
  return new Promise((resolve) => {
    const nonce = makeNonce();
    const channel = openChannel(stream);
    let settled = false;
    const finish = (outcome: ProbeOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel.onopen = null;
      channel.onmessage = null;
      channel.onclose = null;
      channel.close(1000);
      resolve(outcome);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), timeoutMs);
    channel.onopen = () => channel.send(JSON.stringify({ type: "probe:room", code: room.code, token: room.token, nonce }));
    channel.onmessage = (event: MessageEvent<string>) => {
      const message = readEnvelope(event.data);
      if (message?.type !== "probe:result" || message.nonce !== nonce) return;
      finish(message.ok ? { ok: true } : { ok: false, reason: message.reason ?? "no-echo" });
    };
    channel.onclose = () => finish({ ok: false, reason: "transport" });
  });
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
