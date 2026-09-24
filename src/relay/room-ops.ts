import type { Slot } from "@/shared/players";
import type { RoomStore } from "./backend";
import { logFailure } from "./log";
import { makeRoomCode, makeToken } from "./room-code";
import * as rules from "./room-state";

/** Tries before giving up on finding an unused room code. */
const CODE_ATTEMPTS = 20;
/** Rooms one address may create a minute. A real host makes one, maybe two. */
const CREATES_PER_MINUTE = 10;
/** Wrong room codes one address may try a minute, typos and retries included. */
const MISSES_PER_MINUTE = 20;
/** Giving a seat back matters enough to try more than once. */
const RELEASE_ATTEMPTS = 3;

/**
 * The room rules applied through the store. Each method is one atomic
 * read, change and write of a room, so two instances racing to seat two
 * phones can never both land in seat one.
 */
export class RoomOps {
  constructor(
    private readonly store: RoomStore,
    private readonly now: () => number,
  ) {}

  /** Makes a room with a fresh code. Null if no free code turned up. */
  async create(conn: string, joinUrlFor: (code: string) => string): Promise<rules.RoomRecord | null> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const code = makeRoomCode();
      const room = rules.newRoom(code, makeToken(), joinUrlFor(code), conn);
      if (await this.store.create(room)) return room;
    }
    return null;
  }

  /** False once this address has made too many rooms this minute. */
  async allowCreate(client: string): Promise<boolean> {
    return (await this.store.bump(`create:${client}`)) <= CREATES_PER_MINUTE;
  }

  /** Counts a failed join. False once this address has missed too often this minute. */
  async allowMiss(client: string): Promise<boolean> {
    return (await this.store.bump(`miss:${client}`)) <= MISSES_PER_MINUTE;
  }

  resumeHost(code: string, token: string, conn: string) {
    const now = this.now();
    return this.store.update(code, (room) => {
      const claimed = rules.claimHost(room, token, conn, now);
      return claimed ? { room: claimed.room, result: claimed } : { room: null, result: null };
    });
  }

  joinSeat(code: string, token: string | undefined, conn: string) {
    const now = this.now();
    const newToken = makeToken();
    return this.store.update(code, (room) => {
      const { room: next, claim } = rules.claimSeat(room, token, conn, newToken, now);
      return { room: claim.ok ? next : null, result: { claim, hostHere: room.hostConn !== null } };
    });
  }

  /** True if this connection was the host and is now marked away. */
  releaseHost(code: string, conn: string): Promise<boolean> {
    return this.release(code, (room, now) => rules.releaseHost(room, conn, now));
  }

  /** True if this connection held the seat and it is now marked away. */
  releaseSeat(code: string, slot: Slot, conn: string): Promise<boolean> {
    return this.release(code, (room, now) => rules.releaseSeat(room, slot, conn, now));
  }

  /** True if this connection held the seat and it is now empty. */
  vacateSeat(code: string, slot: Slot, conn: string): Promise<boolean> {
    return this.release(code, (room) => rules.vacateSeat(room, slot, conn));
  }

  /** Closes the room if `conn` is its host. True if it did. */
  async closeByHost(code: string, conn: string): Promise<boolean> {
    return this.closeIf(code, (room) => room.hostConn === conn);
  }

  /** Closes the room if its host has been gone past the grace period. */
  async closeIfHostGone(code: string): Promise<boolean> {
    const now = this.now();
    return this.closeIf(code, (room) => !room.closed && rules.hostExpired(room, now));
  }

  /**
   * A release that fails would leave a seat held by a connection that is
   * gone, which nothing else would ever free. So it gets a few tries.
   */
  private async release(code: string, change: (room: rules.RoomRecord, now: number) => rules.RoomRecord | null): Promise<boolean> {
    for (let attempt = 1; ; attempt++) {
      try {
        const now = this.now();
        const released = await this.store.update(code, (room) => {
          const next = change(room, now);
          return { room: next, result: next !== null };
        });
        return released === true;
      } catch (error) {
        if (attempt >= RELEASE_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
  }

  private async closeIf(code: string, test: (room: rules.RoomRecord) => boolean): Promise<boolean> {
    const closed = await this.store.update(code, (room) =>
      test(room) ? { room: { ...room, closed: true }, result: true } : { room: null, result: false },
    );
    if (!closed) return false;
    // The room is already marked closed and expires by itself, so a failed
    // delete must not stop everyone being told.
    await this.store.delete(code).catch((error: unknown) => logFailure("Room delete failed", error));
    return true;
  }
}
