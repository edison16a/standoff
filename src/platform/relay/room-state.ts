import type { Seat } from "@/platform/protocol";

/** How long a room waits for its host to come back after a reload. */
export const HOST_GRACE_MS = 30_000;
/** How long a phone keeps its seat after dropping off the network. */
export const SEAT_GRACE_MS = 60_000;

export interface SeatRecord {
  token: string;
  /** The connection holding the seat, or null while the phone is away. */
  conn: string | null;
  /** When the phone dropped, so the seat can be freed after the grace period. */
  awaySince: number | null;
}

/**
 * Everything the relay knows about one room, as plain data. It is small
 * enough to store as one JSON value, which is what lets the same rules run
 * against an in-memory map on a laptop and against Redis on Vercel, where
 * the host and the phones may be connected to different server instances.
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
  /** One entry per seat, seat 1 first. Its length is how many phones the room takes. */
  seats: (SeatRecord | null)[];
}

export type SeatClaim =
  | { ok: true; seat: Seat; token: string; rejoined: boolean; replaced: string | null }
  | { ok: false; reason: "full" | "closed" };

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

/** True once the host has been gone longer than the grace period. */
export function hostExpired(room: RoomRecord, now: number): boolean {
  return room.hostConn === null && room.hostAwaySince !== null && now - room.hostAwaySince > HOST_GRACE_MS;
}

/** A room nobody can join or resume any more. */
export function isDead(room: RoomRecord, now: number): boolean {
  return room.closed || hostExpired(room, now);
}

function seatFree(seat: SeatRecord | null, now: number): boolean {
  return seat === null || (seat.conn === null && seat.awaySince !== null && now - seat.awaySince > SEAT_GRACE_MS);
}

/**
 * Seats a phone. A known token gets its old seat back, and whichever
 * connection held it before is reported so it can be closed. Otherwise the
 * phone takes the lowest free seat, which is how join order decides who is
 * player one. A seat whose phone has been gone past the grace period
 * counts as free.
 */
export function claimSeat(
  room: RoomRecord,
  token: string | undefined,
  conn: string,
  newToken: string,
  now: number,
): { room: RoomRecord; claim: SeatClaim } {
  if (isDead(room, now)) return { room, claim: { ok: false, reason: "closed" } };
  const known = token ? room.seats.findIndex((seat) => seat?.token === token) : -1;
  if (token && known >= 0) {
    const next = withSeat(room, known + 1, { token, conn, awaySince: null });
    return { room: next, claim: { ok: true, seat: known + 1, token, rejoined: true, replaced: room.seats[known]!.conn } };
  }
  const free = room.seats.findIndex((seat) => seatFree(seat, now));
  if (free < 0) return { room, claim: { ok: false, reason: "full" } };
  const next = withSeat(room, free + 1, { token: newToken, conn, awaySince: null });
  return { room: next, claim: { ok: true, seat: free + 1, token: newToken, rejoined: false, replaced: null } };
}

/** Marks a seat away, but only if this connection still holds it. */
export function releaseSeat(room: RoomRecord, seat: Seat, conn: string, now: number): RoomRecord | null {
  const held = room.seats[seat - 1];
  if (!held || held.conn !== conn) return null;
  return withSeat(room, seat, { ...held, conn: null, awaySince: now });
}

/** Empties a seat this connection holds, for a join whose token never reached the phone. */
export function vacateSeat(room: RoomRecord, seat: Seat, conn: string): RoomRecord | null {
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

/** Marks the host away, but only if this connection is still the host. */
export function releaseHost(room: RoomRecord, conn: string, now: number): RoomRecord | null {
  if (room.hostConn !== conn) return null;
  return { ...room, hostConn: null, hostAwaySince: now };
}

/** Which seats have a phone right now, seat 1 first. */
export function connectedSeats(room: RoomRecord): boolean[] {
  return room.seats.map((seat) => Boolean(seat?.conn));
}

function withSeat(room: RoomRecord, seat: Seat, record: SeatRecord | null): RoomRecord {
  return { ...room, seats: room.seats.map((current, i) => (i === seat - 1 ? record : current)) };
}
