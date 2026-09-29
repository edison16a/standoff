import type { ClientEnvelope } from "@/platform/protocol";

/** A retire goes out again until the relay confirms it, for this long at most. */
export const RETIRE_RESEND_MS = 4000;
export const RETIRE_GIVE_UP_MS = 60_000;

type Retire = Extract<ClientEnvelope, { type: "host:retire" }>;

/**
 * Rooms the host has ended by their token and is waiting to hear back
 * about. A lost reply once left phones sitting in an old game, so each
 * retire is sent again until the relay answers, and a new socket sends
 * every one still waiting before anything else.
 */
export class RetireQueue {
  private readonly waiting = new Map<string, { message: Retire; since: number }>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly send: (message: Retire) => void) {}

  add(room: { code: string; token: string }, movedTo?: string): void {
    if (!room.token) return;
    const message: Retire = { type: "host:retire", code: room.code, token: room.token, ...(movedTo ? { movedTo } : {}) };
    this.waiting.set(room.code, { message, since: Date.now() });
    this.send(message);
    this.timer ??= setInterval(() => this.resend(), RETIRE_RESEND_MS);
  }

  /** The relay answered for this code, found or not. */
  confirm(code: string): void {
    this.waiting.delete(code);
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
    for (const [code, { message, since }] of this.waiting) {
      if (now - since > RETIRE_GIVE_UP_MS) this.waiting.delete(code);
      else this.send(message);
    }
    if (this.waiting.size === 0) this.stop();
  }
}
