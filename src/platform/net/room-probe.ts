import type { ProbeFailure } from "@/platform/protocol";
import { openChannel, readEnvelope, type Channel } from "./open-channel";
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
export function probeRoom(room: { code: string; token: string }, options: ProbeOptions = {}): Promise<ProbeOutcome> {
  const { stream = preferStream(), timeoutMs = PROBE_TIMEOUT_MS, nonce = makeNonce() } = options;
  return new Promise((resolve) => {
    let channel: Channel;
    let settled = false;
    const finish = (outcome: ProbeOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      quiet(channel);
      channel.close(1000);
      resolve(outcome);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), timeoutMs);
    const open = (overStream: boolean) => {
      channel = openChannel(overStream);
      let opened = false;
      channel.onopen = () => {
        opened = true;
        channel.send(JSON.stringify({ type: "probe:room", code: room.code, token: room.token, nonce }));
      };
      channel.onmessage = (event: MessageEvent<string>) => {
        const message = readEnvelope(event.data);
        if (message?.type !== "probe:result" || message.nonce !== nonce) return;
        finish(message.ok ? { ok: true } : { ok: false, reason: message.reason ?? "no-echo" });
      };
      channel.onclose = () => {
        if (opened || overStream) return finish({ ok: false, reason: "transport" });
        quiet(channel);
        open(true);
      };
    };
    open(stream);
  });
}

function quiet(channel: Channel): void {
  channel.onopen = null;
  channel.onmessage = null;
  channel.onclose = null;
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
