import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

describe("Lobby", () => {
  it("gives each driver to one player only", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.connect(2);
    expect(lobby.pick(1, "blaze")).toBe(true);
    expect(lobby.pick(2, "blaze")).toBe(false);
    expect(lobby.taken(2)).toEqual(["blaze"]);
    expect(lobby.pick(2, "pip")).toBe(true);
  });

  it("frees a driver while its player is away, and clears the clash when they return", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.connect(2);
    lobby.pick(1, "nova");
    lobby.disconnect(1);
    expect(lobby.pick(2, "nova")).toBe(true);
    lobby.connect(1);
    expect(lobby.seats.get(1)!.pick).toBeNull();
  });

  it("needs a driver before ready, and drops ready on leaving", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.setReady(1, true);
    expect(lobby.readySeats).toEqual([]);
    lobby.pick(1, "mochi");
    lobby.setReady(1, true);
    expect(lobby.readySeats).toEqual([1]);
    lobby.disconnect(1);
    expect(lobby.readySeats).toEqual([]);
  });

  it("fills the grid with computer karts in the spare drivers, in front of the players", () => {
    const lobby = new Lobby();
    lobby.connect(2);
    lobby.pick(2, "pip");
    lobby.setReady(2, true);
    const grid = lobby.entrants(true);
    expect(grid).toHaveLength(4);
    expect(grid.at(-1)).toEqual({ character: "pip", seat: 2 });
    expect(new Set(grid.map((e) => e.character)).size).toBe(4);
    expect(lobby.entrants(false)).toEqual([{ character: "pip", seat: 2 }]);
  });
});
