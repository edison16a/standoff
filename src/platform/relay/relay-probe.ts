import type { ClientEnvelope, ProbeFailure, ServerEnvelope } from "@/platform/protocol";
import type { Bus } from "./backend";
import { channels, decode, encode } from "./channels";
import { logFailure } from "./log";
import type { RoomOps } from "./room-ops";
import { isDead } from "./room-state";

/** How long the host gets to echo a check. A live host answers in well under a second. */
export const ECHO_WAIT_MS = 3500;

type ProbeRequest = Extract<ClientEnvelope, { type: "probe:room" }>;

/**
 * Answers one host's check of its own room, from a throwaway connection,
 * the way a phone would reach the room. The room must exist in the store
 * this connection sees, and a message must reach the host and come back.
 * Then the connection is closed from here, so a check never leaves a
 * stream open on Vercel.
 */
export class RoomProbe {
  private done = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => Promise<void>) | null = null;

  constructor(
    private readonly ops: RoomOps,
    private readonly bus: Bus,
    private readonly now: () => number,
    private readonly send: (envelope: ServerEnvelope) => void,
    private readonly close: (code: number) => void,
  ) {}

  /** Returns once the check is under way. The answer follows on its own. */
  async run({ code, token, nonce }: ProbeRequest): Promise<void> {
    const answer = (ok: boolean, reason?: ProbeFailure) => this.answer(nonce, ok, reason);
    try {
      const room = await this.ops.peek(code);
      // A wrong token looks exactly like a missing room, so a check tells a guesser nothing.
      if (!room || room.hostToken !== token) return answer(false, "not-found");
      if (room.closed) return answer(false, room.movedTo ? "moved" : "closed");
      if (isDead(room, this.now())) return answer(false, "closed");
      const unsubscribe = await this.bus.subscribe(channels.probe(nonce), (raw) => {
        const message = decode(raw);
        if (message?.kind === "deliver" && message.envelope.type === "probe:result" && message.envelope.nonce === nonce) answer(message.envelope.ok);
      });
      // The client may have gone while the subscription was being set up.
      if (this.done) return void unsubscribe().catch(() => undefined);
      this.unsubscribe = unsubscribe;
      const reached = await this.bus.publish(channels.host(code), encode({ kind: "deliver", envelope: { type: "room:probe", nonce } }));
      if (reached === 0) return answer(false, "no-host");
      if (!this.done) this.timer = setTimeout(() => answer(false, "no-echo"), ECHO_WAIT_MS);
    } catch (error) {
      logFailure("Room check failed", error);
      answer(false, "no-host");
    }
  }

  /** The connection went away. */
  cancel(): void {
    this.done = true;
    this.cleanup();
  }

  private answer(nonce: string, ok: boolean, reason?: ProbeFailure): void {
    if (this.done) return;
    this.done = true;
    this.cleanup();
    this.send(ok ? { type: "probe:result", nonce, ok } : { type: "probe:result", nonce, ok, reason });
    this.close(1000);
  }

  private cleanup(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    unsubscribe?.().catch((error: unknown) => logFailure("Unsubscribe failed", error));
  }
}

/** The host's answer to a check, sent back to whichever connection is waiting for it. */
export function echoProbe(bus: Bus, nonce: string): void {
  const message = encode({ kind: "deliver", envelope: { type: "probe:result", nonce, ok: true } });
  bus.publish(channels.probe(nonce), message).catch((error: unknown) => logFailure("Publish failed", error));
}
