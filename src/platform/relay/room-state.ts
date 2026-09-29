import type { Seat } from "@/platform/protocol";

/** How long a room waits for its host to come back after a reload. */
export const HOST_GRACE_MS = 30_000;
/** How long a phone keeps its seat after dropping off the network. */
export const SEAT_GRACE_MS = 60_000;
/**
 * How long an ended room is kept as a tombstone. A phone that slept
 * through the end, or through a move to a new code, still hears "ended"
 * or the new code when it wakes, instead of "Room not found".
 */
export const TOMBSTONE_MS = 600_000;

export interface SeatRecord {
  token: string;
  /** The connection holding the seat, or null while the phone is away. */
  conn: string | null;
  /** When the phone dropped, so the seat can be freed after the grace period. */
  awaySince: number | null;
  /**
   * The player's name, unique in the room, so a phone can come back as it.
   * Optional because rooms saved before names lived here have none.
   */
  name?: string | null;
}

/**
 * Everything the relay knows about one room, as plain data. It is small
 * enough to store as one JSON value, which is what lets the same rules run
 * against an in-memory map on a laptop and against Redis on Vercel, where
 * the host and the phones may be connected to different server instances.
 * Seating rules live in seat-claim.ts.
 */
export interface RoomRecord {
  code: string;
  hostToken: string;
  joinUrl: string;
  /** Which game this room plays. The relay only passes it on. */
  game: string;
  hostConn: string | null;
  hostAwaySince: number | null;
  closed: boolean;
  /** When the room ended. Optional because rooms saved before tombstones have none. */
  closedAt?: number | null;
  /** The room the host moved to, so a late phone can follow. */
  movedTo?: string | null;
  /** One entry per seat, seat 1 first. Its length is how many phones the room takes. */
  seats: (SeatRecord | null)[];
}

export interface NewRoom {
  code: string;
  hostToken: string;
  joinUrl: string;
  hostConn: string;
  game: string;
  seats: number;
}

export function newRoom({ seats, ...room }: NewRoom): RoomRecord {
  return { ...room, hostAwaySince: null, closed: false, seats: Array.from({ length: seats }, () => null) };
}

/**
 * The same room made again on a server instance that never had it, from
 * the host's signed token. Its seats wait for their phones, under the
 * names the host remembers, and each phone takes its own back with its
 * signed seat token (see claimSeat).
 */
export function restoredRoom(room: NewRoom, names: (string | null)[], now: number): RoomRecord {
  const fresh = newRoom(room);
  const seats = fresh.seats.map((_, i): SeatRecord | null => (names[i] ? { token: "", conn: null, awaySince: now, name: names[i] } : null));
  return { ...fresh, seats };
}

/** True once the host has been gone longer than the grace period. */
export function hostExpired(room: RoomRecord, now: number): boolean {
  return room.hostConn === null && room.hostAwaySince !== null && now - room.hostAwaySince > HOST_GRACE_MS;
}

/** A room nobody can join or resume any more. */
export function isDead(room: RoomRecord, now: number): boolean {
  return room.closed || hostExpired(room, now);
}

/**
 * Ends a room for the holder of its token. Allowed on a room that already
 * ended, so a retire that was sent twice, or after a close, still answers.
 */
export function retire(room: RoomRecord, token: string, movedTo: string | null, now: number): RoomRecord | null {
  if (token !== room.hostToken) return null;
  return { ...room, closed: true, closedAt: room.closedAt ?? now, movedTo: movedTo ?? room.movedTo ?? null, hostConn: null };
}

/** An ended room with nothing left but its tombstone. */
export function tombstone(room: RoomRecord, now: number): RoomRecord {
  return { ...room, closed: true, closedAt: room.closedAt ?? now };
}

/**
 * Marks a seat away, but only if this connection still holds it. An ended
 * room is left alone, so a late disconnect never rewrites its tombstone.
 */
export function releaseSeat(room: RoomRecord, seat: Seat, conn: string, now: number): RoomRecord | null {
  if (room.closed) return null;
  const held = room.seats[seat - 1];
  if (!held || held.conn !== conn) return null;
  return withSeat(room, seat, { ...held, conn: null, awaySince: now });
}

/** Empties a seat this connection holds, for a join whose token never reached the phone. */
export function vacateSeat(room: RoomRecord, seat: Seat, conn: string): RoomRecord | null {
  if (room.closed) return null;
  if (room.seats[seat - 1]?.conn !== conn) return null;
  return withSeat(room, seat, null);
}

/** A reloaded host proves it owns the room with its token. */
export function claimHost(
  room: RoomRecord,
  token: string,
  conn: string,
  now: number,
): { room: RoomRecord; replaced: string | null } | null {
  if (isDead(room, now) || token !== room.hostToken) return null;
  return { room: { ...room, hostConn: conn, hostAwaySince: null }, replaced: room.hostConn };
}

/** Marks the host away, but only if this connection is still the host of a live room. */
export function releaseHost(room: RoomRecord, conn: string, now: number): RoomRecord | null {
  if (room.closed || room.hostConn !== conn) return null;
  return { ...room, hostConn: null, hostAwaySince: now };
}

/** Which seats have a phone right now, seat 1 first. */
export function connectedSeats(room: RoomRecord): boolean[] {
  return room.seats.map((seat) => Boolean(seat?.conn));
}

/** Each seat's player name, seat 1 first, null where nobody has sat. */
export function seatNames(room: RoomRecord): (string | null)[] {
  return room.seats.map((seat) => seat?.name ?? null);
}

export function withSeat(room: RoomRecord, seat: Seat, record: SeatRecord | null): RoomRecord {
  return { ...room, seats: room.seats.map((current, i) => (i === seat - 1 ? record : current)) };
}
