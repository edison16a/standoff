import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

describe("Lobby", () => {
  it("starts only once both players are here, picked and ready", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.connect(2);
    lobby.pick(1, "vale");
    lobby.setReady(1, true);
    expect(lobby.canStart).toBe(false);
    lobby.pick(2, "iron");
    lobby.setReady(2, true);
    expect(lobby.canStart).toBe(true);
    expect(lobby.picks).toEqual({ 1: "vale", 2: "iron" });
  });

  it("refuses a fencer the other player already has", () => {
    const lobby = new Lobby();
    lobby.pick(1, "marrow");
    expect(lobby.pick(2, "marrow")).toBe(false);
    expect(lobby.seats[2].pick).toBeNull();
  });

  it("drops ready when the pick changes, and cannot be ready without a pick", () => {
    const lobby = new Lobby();
    lobby.setReady(1, true);
    expect(lobby.seats[1].ready).toBe(false);
    lobby.pick(1, "vale");
    lobby.setReady(1, true);
    lobby.pick(1, "duchess");
    expect(lobby.seats[1].ready).toBe(false);
  });

  it("seats the computer ready to play on a fencer nobody has", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.pick(1, "iron");
    expect(lobby.seatComputer(2)).toBe(true);
    expect(lobby.seats[2]).toMatchObject({ connected: true, ready: true, computer: true, pick: "marrow" });
    lobby.setReady(1, true);
    expect(lobby.canStart).toBe(true);
  });

  it("moves the computer off a fencer the player wants", () => {
    const lobby = new Lobby();
    lobby.seatComputer(2);
    expect(lobby.seats[2].pick).toBe("iron");
    expect(lobby.pick(1, "iron")).toBe(true);
    expect(lobby.seats[2].pick).toBe("marrow");
  });

  it("keeps the computer ready between matches and frees its seat on request", () => {
    const lobby = new Lobby();
    lobby.seatComputer(2);
    lobby.clearReady();
    expect(lobby.seats[2].ready).toBe(true);
    expect(lobby.unseatComputer(2)).toBe(true);
    expect(lobby.seats[2]).toMatchObject({ connected: false, pick: null, computer: false });
  });
});
