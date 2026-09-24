import type { Slot } from "@/shared/players";
import type { RoomStore } from "./backend";
import { makeRoomCode, makeToken } from "./room-code";
import * as rules from "./room-state";

/** Tries before giving up on finding an unused room code. */
const CODE_ATTEMPTS = 20;

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
  async releaseHost(code: string, conn: string): Promise<boolean> {
    const now = this.now();
    const released = await this.store.update(code, (room) => {
      const next = rules.releaseHost(room, conn, now);
      return { room: next, result: next !== null };
    });
    return released === true;
  }

  /** True if this connection held the seat and it is now marked away. */
  async releaseSeat(code: string, slot: Slot, conn: string): Promise<boolean> {
    const now = this.now();
    const released = await this.store.update(code, (room) => {
      const next = rules.releaseSeat(room, slot, conn, now);
      return { room: next, result: next !== null };
    });
    return released === true;
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

  private async closeIf(code: string, test: (room: rules.RoomRecord) => boolean): Promise<boolean> {
    const closed = await this.store.update(code, (room) =>
      test(room) ? { room: { ...room, closed: true }, result: true } : { room: null, result: false },
    );
    if (closed) await this.store.delete(code);
    return closed === true;
  }
}
