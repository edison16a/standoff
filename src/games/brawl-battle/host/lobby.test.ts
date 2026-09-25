import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

function readyPlayer(lobby: Lobby, seat: number, character: Parameters<Lobby["pick"]>[1]): void {
  lobby.connect(seat);
  lobby.pick(seat, character);
  lobby.setReady(seat, true);
}

describe("the lobby", () => {
  it("fills with the computers the host asked for, taking fighters nobody picked", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "karate");
    readyPlayer(lobby, 2, "karate");
    lobby.setBots(2);
    const entrants = lobby.entrants();
    expect(entrants).toEqual([
      { character: "karate", seat: 1 },
      { character: "karate", seat: 2 },
      { character: "samurai", seat: null },
      { character: "mage", seat: null },
    ]);
  });

  it("never goes past four fighters", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "bear");
    readyPlayer(lobby, 2, "mage");
    readyPlayer(lobby, 3, "samurai");
    lobby.setBots(3);
    expect(lobby.entrants()).toHaveLength(4);
    expect(lobby.slots().filter((s) => s.kind === "bot")).toHaveLength(1);
  });

  it("shows open places before the computers, so there is always room to join", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "bear");
    lobby.setBots(1);
    expect(lobby.slots().map((s) => s.kind)).toEqual(["player", "open", "open", "bot"]);
  });

  it("gives a player alone one computer to fight, even with none asked for", () => {
    const lobby = new Lobby();
    lobby.setBots(0);
    expect(lobby.canStart()).toBe(false);
    readyPlayer(lobby, 1, "mage");
    expect(lobby.botsJoining()).toBe(1);
    expect(lobby.canStart()).toBe(true);
    readyPlayer(lobby, 2, "bear");
    expect(lobby.botsJoining()).toBe(0);
  });

  it("leaves out players still choosing, and keeps a dropped player's pick", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "samurai");
    lobby.connect(2);
    lobby.pick(2, "bear");
    expect(lobby.readySeats).toEqual([1]);
    lobby.disconnect(1);
    expect(lobby.readySeats).toEqual([]);
    lobby.connect(1);
    expect(lobby.seats.get(1)!.pick).toBe("samurai");
    expect(lobby.readySeats).toEqual([1]);
  });

  it("will not mark ready without a pick", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.setReady(1, true);
    expect(lobby.seats.get(1)!.ready).toBe(false);
  });
});
