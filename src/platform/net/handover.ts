import type { ServerEnvelope } from "@/platform/protocol";

/** A kick this soon after our own new socket announced itself was caused by it. */
const OWN_KICK_MS = 10_000;
/** A refused handover is tried again this much later, a few times per rotation, while the old socket lives. */
const RETRY_MS = 3000;
const RETRIES = 2;

/** The replies that mean a new socket has taken over the seat or the room. */
export const HANDSHAKES = new Set<ServerEnvelope["type"]>(["phone:joined", "room:resumed", "room:created"]);
/** Final whichever socket carries them, so a handover socket passes them on too. */
export const FINAL = new Set<ServerEnvelope["type"]>(["room:moved", "room:retired"]);

/**
 * Bookkeeping for moving to a fresh socket before the old one is cut (see
 * SocketClient). It keeps what went out on the new socket before it
 * confirmed, whether the server already asked that one to move on as well,
 * and when it announced itself, since that is when the relay kicks the old
 * socket.
 */
export class Handover {
  private sent: string[] = [];
  private announcedAt = -Infinity;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** The new socket was told to rotate before it confirmed. */
  rotateAfter = false;

  /** The server asked for a move: a fresh rotation gets its own retries. */
  rotating(): void {
    this.retries = 0;
  }

  /**
   * A handover was refused, maybe on a server instance that does not know
   * the room. `dial` runs a little later, a couple of times per rotation.
   */
  retryLater(dial: () => void): boolean {
    if (this.retries >= RETRIES) return false;
    this.retries += 1;
    this.stop();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      dial();
    }, RETRY_MS);
    return true;
  }

  stop(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  announced(): void {
    this.announcedAt = Date.now();
  }

  record(data: string): void {
    this.sent.push(data);
  }

  /** True if a kick arriving now most likely came from our own new socket. */
  causedKick(): boolean {
    return Date.now() - this.announcedAt < OWN_KICK_MS;
  }

  /** The new socket took over. Returns whether it should hand over again at once. */
  done(): boolean {
    const again = this.rotateAfter;
    this.sent = [];
    this.rotateAfter = false;
    this.announcedAt = -Infinity;
    return again;
  }

  /**
   * The new socket died before confirming. Returns what went out on it, to
   * send again on the old one. The announce time stays, because the kick it
   * caused may still be on its way.
   */
  failed(): string[] {
    const sent = this.sent;
    this.sent = [];
    this.rotateAfter = false;
    return sent;
  }
}
