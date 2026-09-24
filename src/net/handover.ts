/** A kick this soon after our own new socket announced itself was caused by it. */
const OWN_KICK_MS = 10_000;

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
  /** The new socket was told to rotate before it confirmed. */
  rotateAfter = false;

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
