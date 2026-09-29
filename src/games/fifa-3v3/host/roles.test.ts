import { describe, expect, it } from "vitest";
import { createMatch } from "../engine/match";
import { laneOf } from "../engine/lanes";
import { Lobby } from "./lobby";

function ready(lobby: Lobby, seat: number, star: "echeverri" | "okemba" | "lacerda", team: 0 | 1): void {
  lobby.connect(seat);
  lobby.pick(seat, star);
  lobby.setTeam(seat, team);
  lobby.setReady(seat, true);
}

describe("roles and difficulty in the lobby", () => {
  it("hands each player joining a side the first free role", () => {
    const lobby = new Lobby();
    ready(lobby, 1, "echeverri", 0);
    ready(lobby, 2, "okemba", 0);
    expect(lobby.seats.get(1)!.role).toBe(0);
    expect(lobby.seats.get(2)!.role).toBe(1);
  });

  it("swaps roles with the team mate who had the one asked for", () => {
    const lobby = new Lobby();
    ready(lobby, 1, "echeverri", 0);
    ready(lobby, 2, "okemba", 0);
    lobby.cycleRole(1);
    expect(lobby.seats.get(1)!.role).toBe(1);
    expect(lobby.seats.get(2)!.role).toBe(0);
  });

  it("lines each side up in role order, computers taking the roles left", () => {
    const lobby = new Lobby();
    ready(lobby, 1, "echeverri", 0);
    lobby.cycleRole(1);
    lobby.cycleRole(1);
    const red = lobby.entrants().filter((e) => e.team === 0);
    expect(red.map((e) => e.slot)).toEqual([0, 1, 2]);
    expect(red[2]!.seat).toBe(1);
    const match = createMatch(lobby.entrants());
    const me = match.athletes.find((a) => a.seat === 1)!;
    expect(me.slot).toBe(2);
    // The Right wing of Red, attacking +x, keeps to +z.
    expect(laneOf(match, me)).toBe(1);
  });

  it("gives a small side a Striker whatever roles it was given", () => {
    const lobby = new Lobby();
    lobby.setBots(false);
    ready(lobby, 1, "echeverri", 0);
    lobby.cycleRole(1);
    ready(lobby, 2, "okemba", 1);
    const match = createMatch(lobby.entrants());
    expect(match.athletes.map((a) => a.slot)).toEqual([0, 0]);
  });

  it("starts on Easy and keeps the level the host picks", () => {
    const lobby = new Lobby();
    expect(lobby.level).toBe("easy");
    lobby.setLevel("training");
    expect(lobby.level).toBe("training");
  });
});
