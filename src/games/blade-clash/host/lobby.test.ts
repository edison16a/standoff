import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

describe("Lobby", () => {
  it("starts only once both players are here, picked and ready", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.connect(2);
    lobby.pick(1, "star");
    lobby.setReady(1, true);
    expect(lobby.canStart).toBe(false);
    lobby.pick(2, "knight");
    lobby.setReady(2, true);
    expect(lobby.canStart).toBe(true);
    expect(lobby.picks).toEqual({ 1: "star", 2: "knight" });
  });

  it("refuses a fighter the other player already has", () => {
    const lobby = new Lobby();
    lobby.pick(1, "block");
    expect(lobby.pick(2, "block")).toBe(false);
    expect(lobby.seats[2].pick).toBeNull();
  });

  it("drops ready when the pick changes, and cannot be ready without a pick", () => {
    const lobby = new Lobby();
    lobby.setReady(1, true);
    expect(lobby.seats[1].ready).toBe(false);
    lobby.pick(1, "star");
    lobby.setReady(1, true);
    lobby.pick(1, "samurai");
    expect(lobby.seats[1].ready).toBe(false);
  });

  it("seats the computer ready to play on a fighter nobody has", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.pick(1, "knight");
    expect(lobby.seatComputer(2)).toBe(true);
    expect(lobby.seats[2]).toMatchObject({ connected: true, ready: true, computer: true, pick: "samurai" });
    lobby.setReady(1, true);
    expect(lobby.canStart).toBe(true);
  });

  it("moves the computer off a fighter the player wants", () => {
    const lobby = new Lobby();
    lobby.seatComputer(2);
    expect(lobby.seats[2].pick).toBe("knight");
    expect(lobby.pick(1, "knight")).toBe(true);
    expect(lobby.seats[2].pick).toBe("samurai");
  });

  it("keeps the computer ready between matches and frees its seat on request", () => {
    const lobby = new Lobby();
    lobby.seatComputer(2);
    lobby.clearReady();
    expect(lobby.seats[2].ready).toBe(true);
    expect(lobby.unseatComputer(2)).toBe(true);
    expect(lobby.seats[2]).toMatchObject({ connected: false, pick: null, computer: false });
  });

  it("plays the computer only against someone who is here", () => {
    const lobby = new Lobby();
    lobby.setComputer(true);
    expect(lobby.computerSlot).toBeNull();
    lobby.connect(1);
    lobby.setComputer(true);
    expect(lobby.computerSlot).toBe(2);
    lobby.setComputer(false);
    expect(lobby.computerSlot).toBeNull();
  });
});
