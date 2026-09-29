import { defaultName, nameKey } from "@/platform/profile";
import type { NameClash, Seat } from "@/platform/protocol";
import { isDead, SEAT_GRACE_MS, withSeat, type RoomRecord, type SeatRecord } from "./room-state";

export type SeatClaim =
  | { ok: true; seat: Seat; token: string; name: string; rejoined: boolean; replaced: string | null }
  | { ok: false; reason: "full" | "closed" | NameClash };

/** What a phone asks for when it joins. */
export interface SeatRequest {
  /** Proves the phone held a seat before. */
  token?: string;
  /** Already cleaned. Missing means the phone skipped the name. */
  name?: string;
  /** Only take back the seat this name holds, never a new one. */
  reconnect?: boolean;
}

function seatFree(seat: SeatRecord | null, now: number): boolean {
  return seat === null || (seat.conn === null && seat.awaySince !== null && now - seat.awaySince > SEAT_GRACE_MS);
}

/** The seat whose player goes by this name, ignoring case and spaces. -1 if none. */
export function seatNamed(room: RoomRecord, name: string, except = -1): number {
  const key = nameKey(name);
  return room.seats.findIndex((seat, i) => i !== except && seat?.name != null && nameKey(seat.name) === key);
}

/** "Player 3" for seat 3, or the next free number when someone typed that already. */
export function uniqueDefault(room: RoomRecord, seat: Seat): string {
  for (let n = seat; ; n++) {
    const name = defaultName(n);
    if (seatNamed(room, name, seat - 1) < 0) return name;
  }
}

/**
 * Seats a phone. A known token gets its old seat back, and whichever
 * connection held it before is reported so it can be closed. A name that
 * belongs to a connected player is refused, and one that belongs to a
 * player who dropped is only handed back on a reconnect, so nobody takes
 * over a seat by accident. Otherwise the phone takes the lowest free seat,
 * which is how join order decides who is player one. A seat whose phone
 * has been gone past the grace period counts as free.
 */
export function claimSeat(
  room: RoomRecord,
  request: SeatRequest,
  conn: string,
  newToken: string,
  now: number,
): { room: RoomRecord; claim: SeatClaim } {
  const refuse = (reason: Extract<SeatClaim, { ok: false }>["reason"]) => ({ room, claim: { ok: false, reason } as SeatClaim });
  if (isDead(room, now)) return refuse("closed");
  const { token, name } = request;
  const known = token ? room.seats.findIndex((seat) => seat?.token === token) : -1;
  if (token && known >= 0) {
    const held = room.seats[known]!;
    // A new name sticks only if nobody else goes by it.
    const kept = name && seatNamed(room, name, known) < 0 ? name : (held.name ?? uniqueDefault(room, known + 1));
    return take(room, known, { token, conn, name: kept }, true, held.conn);
  }
  const named = name ? seatNamed(room, name) : -1;
  if (named >= 0) {
    const held = room.seats[named]!;
    if (held.conn !== null) return refuse("name-taken");
    if (!request.reconnect) return refuse("name-away");
    // The old token is lost with the tab, so the seat gets a fresh one.
    return take(room, named, { token: newToken, conn, name: held.name! }, true, null);
  }
  if (request.reconnect) return refuse("no-seat");
  const free = room.seats.findIndex((seat) => seatFree(seat, now));
  if (free < 0) return refuse("full");
  return take(room, free, { token: newToken, conn, name: name ?? uniqueDefault(room, free + 1) }, false, null);
}

function take(
  room: RoomRecord,
  index: number,
  seat: { token: string; conn: string; name: string },
  rejoined: boolean,
  replaced: string | null,
): { room: RoomRecord; claim: SeatClaim } {
  const next = withSeat(room, index + 1, { ...seat, awaySince: null });
  return { room: next, claim: { ok: true, seat: index + 1, token: seat.token, name: seat.name, rejoined, replaced } };
}
