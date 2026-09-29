import type { ClientEnvelope, Seat, ServerEnvelope } from "@/platform/protocol";

/** A phone that dropped gets this long to come back before the host looks where new connections go. */
export const FOLLOW_AFTER_LEFT_MS = 2500;
/** At most one move this often, so requests spread over instances cannot bounce the host around. */
export const FOLLOW_GAP_MS = 10_000;

export interface MoverDeps {
  /** Moves the host's socket to a fresh one, keeping the old till it confirms. False if it cannot now. */
  rotate(): boolean;
  /** Every instance sees the same rooms, so there is never anywhere to follow. */
  shared(): boolean;
  now(): number;
}

/**
 * Keeps the room where new connections go. Without a shared store a room
 * lives in one server instance's memory, and Vercel may start sending new
 * connections, phones joining included, to another. Signs of that: a room
 * check that cannot find the room, or a phone that dropped and does not
 * come back. The host then moves its own socket, which lands where new
 * connections go and makes the room again there from its signed token.
 * Its old socket then tells the old instance to send the phones over.
 */
export class RoomMover {
  private last = -Infinity;
  private readonly waiting = new Map<Seat, ReturnType<typeof setTimeout>>();

  constructor(private readonly deps: MoverDeps) {}

  /** New connections may be going to another instance: move there, unless the host just did. */
  follow(): void {
    if (this.deps.shared() || this.deps.now() - this.last < FOLLOW_GAP_MS) return;
    if (this.deps.rotate()) this.last = this.deps.now();
  }

  /** A phone dropped. If it does not come back soon, it may be waiting where new connections go. */
  left(seat: Seat): void {
    if (this.deps.shared()) return;
    this.back(seat);
    this.waiting.set(
      seat,
      setTimeout(() => {
        this.waiting.delete(seat);
        this.follow();
      }, FOLLOW_AFTER_LEFT_MS),
    );
  }

  back(seat: Seat): void {
    const timer = this.waiting.get(seat);
    if (timer) clearTimeout(timer);
    this.waiting.delete(seat);
  }

  stop(): void {
    for (const seat of [...this.waiting.keys()]) this.back(seat);
  }

  /**
   * The host's new socket took the room over. If it answered from another
   * instance, the old socket's last word lets the old instance go of the
   * room and sends its phones on to fresh sockets.
   */
  handedOver(confirmation: ServerEnvelope, before: string | null, token: string, sendOld: (message: ClientEnvelope) => void): void {
    if (confirmation.type !== "room:resumed" || confirmation.sharedRooms || !token) return;
    const moved = confirmation.restored === true || (before !== null && confirmation.instance !== undefined && confirmation.instance !== before);
    if (moved) sendOld({ type: "host:migrate", code: confirmation.code, token });
  }
}
