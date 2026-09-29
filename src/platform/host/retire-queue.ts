import { askFresh } from "@/platform/net/ask-fresh";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";

/** A retire goes out again until the relay confirms it, for this long at most. */
export const RETIRE_RESEND_MS = 4000;
export const RETIRE_GIVE_UP_MS = 60_000;

export type Retire = Extract<ClientEnvelope, { type: "host:retire" }>;
export type Retired = Extract<ServerEnvelope, { type: "room:retired" }>;

/** Where the room being retired lives, to judge a "not found" answer. */
export interface RetireWhere {
  /** The server instance that last answered for the room. Null when not known. */
  instance: string | null;
  /** Every instance sees the same rooms. */
  shared: boolean;
}

interface Waiting {
  message: Retire;
  since: number;
  where: RetireWhere;
  /** A "not found" came from another instance: the room lives elsewhere, so fresh connections look for it. */
  elsewhere: boolean;
  asking: boolean;
}

/**
 * Rooms the host has ended by their token and is waiting to hear back
 * about. A lost reply once left phones sitting in an old game, so each
 * retire is sent again until the relay answers, and a new socket sends
 * every one still waiting before anything else.
 *
 * Without a shared store, "not found" from an instance other than the
 * room's own only means the room lives somewhere else, as when the host's
 * stream dropped and came back on another instance. Taking that as done
 * stranded the old room's phones, so such a retire keeps going, over
 * fresh connections (`courier`) that may land where the room is.
 */
export class RetireQueue {
  private readonly waiting = new Map<string, Waiting>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly send: (message: Retire) => void,
    private readonly courier: ((message: Retire) => Promise<Retired | null>) | null = null,
  ) {}

  add(room: { code: string; token: string }, movedTo: string | undefined, where: RetireWhere): void {
    if (!room.token) return;
    const message: Retire = { type: "host:retire", code: room.code, token: room.token, ...(movedTo ? { movedTo } : {}) };
    this.waiting.set(room.code, { message, since: Date.now(), where, elsewhere: false, asking: false });
    this.send(message);
    this.timer ??= setInterval(() => this.resend(), RETIRE_RESEND_MS);
  }

  /** The relay answered for this code. Done, unless it only means the room lives on another instance. */
  confirm(reply: Retired, fromCourier = false): void {
    const entry = this.waiting.get(reply.code);
    if (!entry) return;
    if (!settles(reply, entry.where)) {
      entry.elsewhere = true;
      // The first time, a fresh connection looks at once. After that, on the resend beat.
      if (!fromCourier) this.ask(entry);
      return;
    }
    this.waiting.delete(reply.code);
    if (this.waiting.size === 0) this.stop();
  }

  /** What a fresh socket should send first. */
  pending(): Retire[] {
    return [...this.waiting.values()].map(({ message }) => message);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private resend(): void {
    const now = Date.now();
    for (const [code, entry] of this.waiting) {
      if (now - entry.since > RETIRE_GIVE_UP_MS) this.waiting.delete(code);
      else if (entry.elsewhere && this.courier) this.ask(entry);
      else this.send(entry.message);
    }
    if (this.waiting.size === 0) this.stop();
  }

  /** One fresh connection at a time per room. */
  private ask(entry: Waiting): void {
    // Without a courier the resend beat keeps trying the page's own socket, which may move.
    if (!this.courier || entry.asking) return;
    entry.asking = true;
    void this.courier(entry.message).then((reply) => {
      entry.asking = false;
      if (reply && this.waiting.get(reply.code) === entry) this.confirm(reply, true);
    });
  }
}

/**
 * Found, or not found where the room itself lives, or where every
 * instance sees every room. An older relay names no instance, and is taken
 * at its word as before.
 */
export function settles(reply: Retired, where: RetireWhere): boolean {
  if (reply.found || where.shared || !where.instance || !reply.instance) return true;
  return reply.instance === where.instance;
}

/** A retire over a throwaway connection, on the transport the page's own socket uses. */
export function freshCourier(stream: () => boolean): (message: Retire) => Promise<Retired | null> {
  return async (message) => {
    const pick = (reply: ServerEnvelope) => (reply.type === "room:retired" && reply.code === message.code ? reply : null);
    const reply = await askFresh(message, pick, { stream: stream(), timeoutMs: 5000 });
    return typeof reply === "string" ? null : reply;
  };
}
