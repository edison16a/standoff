import type { PhoneRoomEvent } from "@/platform/games/game-api";

/** Host messages kept while the game is still loading. The newest matter most. */
const BACKLOG_LIMIT = 50;

/**
 * The game's listeners on a phone. The game loads after the phone is
 * seated, and the host starts talking straight away, so until the game
 * listens its messages wait here.
 */
export class PhoneEvents {
  private readonly listeners = new Set<(event: PhoneRoomEvent) => void>();
  private backlog: PhoneRoomEvent[] = [];

  emit(event: PhoneRoomEvent): void {
    if (this.listeners.size === 0) {
      this.backlog = [...this.backlog, event].slice(-BACKLOG_LIMIT);
      return;
    }
    for (const listener of [...this.listeners]) listener(event);
  }

  on(listener: (event: PhoneRoomEvent) => void): () => void {
    this.listeners.add(listener);
    const waiting = this.backlog;
    this.backlog = [];
    queueMicrotask(() => waiting.forEach(listener));
    return () => this.listeners.delete(listener);
  }
}
