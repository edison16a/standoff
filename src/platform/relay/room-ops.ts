import type { Seat } from "@/platform/protocol";
import type { RoomStore } from "./backend";
import { makeRoomCode, makeToken } from "./room-code";
import * as rules from "./room-state";
import { claimSeat, type SeatClaim, type SeatRequest } from "./seat-claim";

/** Tries before giving up on finding an unused room code. */
const CODE_ATTEMPTS = 20;
/** Rooms one address may create a minute. A real host makes one, maybe two. */
const CREATES_PER_MINUTE = 10;
/**
 * Wrong room codes one address may try a minute. A household shares one
 * address, and phones look again for a while after a room goes missing.
 */
const MISSES_PER_MINUTE = 40;
/** Giving a seat back matters enough to try more than once. */
const RELEASE_ATTEMPTS = 3;

/** A join's outcome: a seat claim, or the room the host moved to. */
export type JoinOutcome = { moved: string } | { claim: SeatClaim; hostHere: boolean; game: string; seats: number };

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
  async create(
    conn: string,
    joinUrlFor: (code: string) => string,
    game: string,
    seats: number,
  ): Promise<rules.RoomRecord | null> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const code = makeRoomCode();
      const room = rules.newRoom({ code, hostToken: makeToken(), joinUrl: joinUrlFor(code), hostConn: conn, game, seats });
      if (await this.store.create(room)) return room;
    }
    return null;
  }

  /**
   * A fresh room with the same game and seat count, made for the host of
   * `code`, which is then closed. Null if `conn` is not that room's host or
   * no free code turned up, and the old room is left as it was.
   */
  async remake(code: string, conn: string, joinUrlFor: (code: string) => string): Promise<rules.RoomRecord | null> {
    const old = await this.store.get(code);
    if (!old || old.hostConn !== conn) return null;
    const room = await this.create(conn, joinUrlFor, old.game, old.seats.length);
    // The old room points at the new one, so a phone that slept through the move still follows.
    if (room) await this.closeIf(code, (current) => current.hostConn === conn, room.code);
    return room;
  }

  /**
   * Ends a room for whoever holds its token. `oldHost` is the connection
   * that was hosting it, to be kicked. `repeat` means the room had already
   * ended the same way, so its phones were told before.
   */
  async retire(code: string, token: string, movedTo: string | null) {
    const now = this.now();
    return this.store.update(code, (room) => {
      const next = rules.retire(room, token, movedTo, now);
      if (!next) return { room: null, result: null };
      const repeat = room.closed && (room.movedTo ?? null) === next.movedTo;
      return { room: next, result: { seats: room.seats.length, oldHost: room.hostConn, repeat, movedTo: next.movedTo ?? null } };
    });
  }

  /** The room as stored, tombstones included, without changing it. */
  peek(code: string): Promise<rules.RoomRecord | null> {
    return this.store.get(code);
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

  /** Seats a phone. A room that moved sends the phone on, as `moved`, and seats nobody. */
  joinSeat(code: string, request: SeatRequest, conn: string): Promise<JoinOutcome | null> {
    const now = this.now();
    const newToken = makeToken();
    return this.store.update<JoinOutcome>(code, (room) => {
      if (room.closed && room.movedTo) return { room: null, result: { moved: room.movedTo } };
      const { room: next, claim } = claimSeat(room, request, conn, newToken, now);
      return {
        room: claim.ok ? next : null,
        result: { claim, hostHere: room.hostConn !== null, game: room.game, seats: room.seats.length },
      };
    });
  }

  /** True if this connection was the host and is now marked away. */
  releaseHost(code: string, conn: string): Promise<boolean> {
    return this.release(code, (room, now) => rules.releaseHost(room, conn, now));
  }

  /** True if this connection held the seat and it is now marked away. */
  releaseSeat(code: string, seat: Seat, conn: string): Promise<boolean> {
    return this.release(code, (room, now) => rules.releaseSeat(room, seat, conn, now));
  }

  /** True if this connection held the seat and it is now empty. */
  vacateSeat(code: string, seat: Seat, conn: string): Promise<boolean> {
    return this.release(code, (room) => rules.vacateSeat(room, seat, conn));
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

  /**
   * Ends the room but keeps it as a tombstone, which the store expires by
   * itself (see TOMBSTONE_MS). Deleting it at once turned a phone that
   * slept through the end into a "Room not found".
   */
  private async closeIf(code: string, test: (room: rules.RoomRecord) => boolean, movedTo: string | null = null): Promise<boolean> {
    const now = this.now();
    const closed = await this.store.update(code, (room) =>
      test(room) ? { room: { ...rules.tombstone(room, now), movedTo: movedTo ?? room.movedTo ?? null }, result: true } : { room: null, result: false },
    );
    return closed === true;
  }
}
