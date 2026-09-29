import { describe, expect, it } from "vitest";
import { newRoom, releaseSeat, SEAT_GRACE_MS, type RoomRecord } from "./room-state";
import { claimSeat, uniqueDefault, type SeatRequest } from "./seat-claim";

const NOW = 1_000_000;
const room = (seats = 3) => newRoom({ code: "ABCD", hostToken: "h".repeat(20), joinUrl: "x", hostConn: "host", game: "g", seats });

/** Seats a phone and returns the new room, failing the test if it was refused. */
function seat(record: RoomRecord, request: SeatRequest, conn: string, now = NOW) {
  const result = claimSeat(record, request, conn, `token-${conn}`.padEnd(20, "x"), now);
  if (!result.claim.ok) throw new Error(`refused: ${result.claim.reason}`);
  return { room: result.room, claim: result.claim };
}

describe("claimSeat names", () => {
  it("keeps the typed name, and gives a skipped name the seat number", () => {
    const a = seat(room(), { name: "Ann" }, "a");
    const b = seat(a.room, {}, "b");
    expect(a.claim.name).toBe("Ann");
    expect(b.claim.name).toBe("Player 2");
  });

  it("refuses a name a connected player has, whatever the case or spacing", () => {
    const { room: taken } = seat(room(), { name: "Mary Jo" }, "a");
    expect(claimSeat(taken, { name: "maryjo" }, "b", "t".repeat(20), NOW).claim).toEqual({ ok: false, reason: "name-taken" });
  });

  it("offers a dropped player's name as a reconnect, and never seats a stranger in it", () => {
    const { room: joined } = seat(room(), { name: "Ann" }, "a");
    const away = releaseSeat(joined, 1, "a", NOW)!;
    expect(claimSeat(away, { name: "ANN" }, "b", "t".repeat(20), NOW).claim).toEqual({ ok: false, reason: "name-away" });
    const back = seat(away, { name: "ann", reconnect: true }, "b");
    expect(back.claim).toMatchObject({ seat: 1, name: "Ann", rejoined: true, replaced: null });
  });

  it("gives a dropped seat back by name even after its grace period", () => {
    const { room: joined } = seat(room(), { name: "Ann" }, "a");
    const away = releaseSeat(joined, 1, "a", NOW)!;
    const later = NOW + SEAT_GRACE_MS + 1;
    expect(seat(away, { name: "Ann", reconnect: true }, "b", later).claim.seat).toBe(1);
  });

  it("answers a reconnect with no seat by that name", () => {
    expect(claimSeat(room(), { name: "Zed", reconnect: true }, "a", "t".repeat(20), NOW).claim).toEqual({ ok: false, reason: "no-seat" });
  });

  it("lets a known token rejoin, and takes a new name only if it is free", () => {
    const a = seat(room(), { name: "Ann" }, "a");
    const b = seat(a.room, { name: "Bob" }, "b");
    const renamed = seat(b.room, { token: a.claim.token, name: "Bob" }, "a2");
    expect(renamed.claim).toMatchObject({ seat: 1, name: "Ann", rejoined: true, replaced: "a" });
    expect(seat(b.room, { token: a.claim.token, name: "Anna" }, "a3").claim.name).toBe("Anna");
  });

  it("steps past a default name someone typed", () => {
    const { room: typed } = seat(room(), { name: "Player 2" }, "a");
    expect(uniqueDefault(typed, 2)).toBe("Player 3");
    expect(seat(typed, {}, "b").claim.name).toBe("Player 3");
  });

  it("reads rooms saved before seats had names", () => {
    const old: RoomRecord = { ...room(), seats: [{ token: "o".repeat(20), conn: null, awaySince: NOW }, null, null] };
    expect(seat(old, { name: "Ann" }, "a").claim.seat).toBe(2);
    expect(seat(old, { token: "o".repeat(20) }, "a").claim.name).toBe("Player 1");
  });
});
