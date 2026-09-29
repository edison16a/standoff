import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";
import type { PhoneLink } from "./phone-link";
import type { ReplayDirector } from "./replay-director";
import { onRoomEvent, type Seats } from "./room-events";

function seats(): Seats & { forgotten: (number | undefined)[] } {
  const forgotten: (number | undefined)[] = [];
  const phones = { forget: (seat?: number) => forgotten.push(seat) } as unknown as PhoneLink;
  return { lobby: new Lobby(), driver: null, phones, replays: {} as ReplayDirector, players: () => [], forgotten };
}

describe("room events", () => {
  it("seats a phone that joins and hears its build", () => {
    const s = seats();
    expect(onRoomEvent({ type: "joined", seat: 1, rejoined: false }, s)).toBe(true);
    expect(s.forgotten).toEqual([1]);
    expect(onRoomEvent({ type: "message", seat: 1, payload: { kind: "pick", build: "winger" } }, s)).toBe(true);
    expect(s.lobby.seats.get(1)?.pick).toBe("winger");
  });

  it("ignores a message it cannot read, and a release needs no refresh", () => {
    const s = seats();
    onRoomEvent({ type: "joined", seat: 2, rejoined: false }, s);
    expect(onRoomEvent({ type: "message", seat: 2, payload: { kind: "pick", build: "goalhanger" } }, s)).toBe(false);
    expect(s.lobby.seats.get(2)?.pick).toBeNull();
    expect(onRoomEvent({ type: "message", seat: 2, payload: { kind: "release", heldMs: 300 } }, s)).toBe(false);
  });
});
