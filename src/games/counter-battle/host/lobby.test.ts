import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

/** A lobby with these seats connected, each with a gun and ready. */
function lobbyWith(seats: number[], ready = true): Lobby {
  const lobby = new Lobby();
  for (const seat of seats) {
    lobby.connect(seat);
    lobby.setGun(seat, "rifle");
    lobby.setReady(seat, ready);
  }
  return lobby;
}

describe("the lobby", () => {
  it("fills the smaller team first, benches a player with no place, and lets them in at two against two", () => {
    const lobby = lobbyWith([1, 2, 3]);
    expect(lobby.seats.get(1)!.team).toBe(0);
    expect(lobby.seats.get(2)!.team).toBe(1);
    expect(lobby.bench).toEqual([3]);
    lobby.setMode("2v2");
    expect(lobby.bench).toEqual([]);
    expect(lobby.members(0)).toEqual([1, 3]);
    // Back to one against one, the newest on a team sits out again.
    lobby.setMode("1v1");
    expect(lobby.bench).toEqual([3]);
  });

  it("moves a player across, sending the newest on a full team the other way", () => {
    const lobby = lobbyWith([1, 2, 3, 4]);
    lobby.setMode("2v2");
    expect(lobby.members(0)).toEqual([1, 3]);
    expect(lobby.members(1)).toEqual([2, 4]);
    lobby.setTeam(1, 1);
    expect(lobby.members(1)).toContain(1);
    expect(lobby.members(0)).toContain(4);
    expect(lobby.members(0)).toHaveLength(2);
    expect(lobby.members(1)).toHaveLength(2);
  });

  it("fills empty places with computers, and sits out anyone not ready", () => {
    const lobby = lobbyWith([1]);
    lobby.connect(2);
    lobby.setMode("2v2");
    expect(lobby.spots()).toHaveLength(4);
    expect(lobby.spots().filter((s) => s.seat === null)).toHaveLength(2);
    expect(lobby.canStart()).toBe(true);
    const entries = lobby.entries();
    expect(entries.filter((e) => e.seat !== null).map((e) => e.seat)).toEqual([1]);
    expect(entries.filter((e) => e.team === 0)).toHaveLength(2);
    expect(entries.filter((e) => e.team === 1)).toHaveLength(2);
    expect(new Lobby().canStart()).toBe(false);
    expect(lobbyWith([5], false).canStart()).toBe(false);
  });

  it("gives every placed player a view to calibrate in, as the match will split the screen", () => {
    const one = lobbyWith([1]);
    expect(one.views().get(1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    // Two players, one a side: pink on the left, even before they are ready.
    const two = lobbyWith([1, 2], false);
    expect(two.views().get(1)).toEqual({ x: 0, y: 0, w: 0.5, h: 1 });
    expect(two.views().get(2)).toEqual({ x: 0.5, y: 0, w: 0.5, h: 1 });
    const three = lobbyWith([1, 2, 3]);
    three.setMode("2v2");
    for (const seat of [1, 2, 3]) expect(three.views().get(seat)!.w).toBe(0.5);
    expect(three.views().get(1)!.h).toBe(0.5);
    // A player on the bench has no view yet.
    expect(lobbyWith([1, 2, 3]).views().has(3)).toBe(false);
  });

  it("keeps a dropped player's gun and hands their place to someone waiting", () => {
    const lobby = lobbyWith([1, 2, 3]);
    lobby.disconnect(2);
    expect(lobby.seats.get(3)!.team).toBe(1);
    expect(lobby.seats.get(2)!.gun).toBe("rifle");
    lobby.connect(2);
    expect(lobby.bench).toEqual([2]);
  });
});
