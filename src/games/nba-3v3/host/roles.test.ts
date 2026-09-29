import { describe, expect, it } from "vitest";
import { Match } from "../engine/match";
import { Lobby } from "./lobby";

function readyPlayer(lobby: Lobby, seat: number, character: Parameters<Lobby["pick"]>[1]): void {
  lobby.connect(seat);
  lobby.pick(seat, character);
  lobby.setReady(seat, true);
}

describe("roles and difficulty in the lobby", () => {
  it("gives each new teammate the next free role and fills the rest with computers", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "ashby");
    readyPlayer(lobby, 2, "whitlock");
    readyPlayer(lobby, 3, "crane");
    expect(lobby.seats.get(1)!.role).toBe(0);
    expect(lobby.seats.get(3)!.role).toBe(1);
    const home = lobby.spots().filter((s) => s.team === 0);
    expect(home.map((s) => s.role)).toEqual([0, 1, 2]);
  });

  it("swaps roles when the host hands one that a teammate has", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "ashby");
    readyPlayer(lobby, 2, "whitlock");
    lobby.setTeam(2, 0);
    expect(lobby.seats.get(2)!.role).toBe(1);
    lobby.cycleRole(1);
    expect(lobby.seats.get(1)!.role).toBe(1);
    expect(lobby.seats.get(2)!.role).toBe(0);
  });

  it("puts the role into the match as the player's slot", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "ashby");
    lobby.cycleRole(1);
    lobby.cycleRole(1);
    const entries = lobby.entries();
    const mine = entries.find((e) => e.seat === 1)!;
    expect(mine.slot).toBe(2);
    const m = new Match({ entries, seed: 1 });
    expect(m.athletes.find((a) => a.seat === 1)!.slot).toBe(2);
  });

  it("starts on easy and keeps the level the host picks", () => {
    const lobby = new Lobby();
    expect(lobby.level).toBe("easy");
    lobby.setLevel("training");
    expect(lobby.level).toBe("training");
  });
});
