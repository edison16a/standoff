import type { HostRoomEvent } from "@/platform/games/game-api";

/** Enough for every phone's setup messages, small enough that a stuck game never piles them up. */
const BACKLOG_MAX = 200;

/**
 * The game's listeners for one room. Phone messages that arrive before
 * the game listens wait in a backlog: after a reload, phones answer the
 * host coming back while the game's code is still loading, and those
 * answers would otherwise be lost.
 */
export class HostEvents {
  private readonly listeners = new Set<(event: HostRoomEvent) => void>();
  private backlog: HostRoomEvent[] = [];

  /** A new room starts with nobody listening and nothing waiting. */
  clear(): void {
    this.listeners.clear();
    this.backlog = [];
  }

  emit(event: HostRoomEvent): void {
    if (this.listeners.size === 0) {
      if (event.type === "message" && this.backlog.length < BACKLOG_MAX) this.backlog.push(event);
      return;
    }
    for (const listener of [...this.listeners]) listener(event);
  }

  subscribe(listener: (event: HostRoomEvent) => void): () => void {
    this.listeners.add(listener);
    // A game usually subscribes several parts at once, so the backlog
    // goes out once they have all had the chance to listen.
    if (this.backlog.length > 0) {
      queueMicrotask(() => {
        const waiting = this.backlog;
        this.backlog = [];
        for (const event of waiting) this.emit(event);
      });
    }
    return () => this.listeners.delete(listener);
  }
}
