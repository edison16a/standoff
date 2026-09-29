import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

function readyPlayer(lobby: Lobby, seat: number, build: Parameters<Lobby["pick"]>[1]): void {
  lobby.connect(seat);
  lobby.pick(seat, build);
  lobby.setReady(seat, true);
}

describe("the team lobby", () => {
  it("puts new players on the smaller team and fills the rest with computers", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "shooter");
    readyPlayer(lobby, 2, "lockdown");
    readyPlayer(lobby, 3, "playmaker");
    const spots = lobby.spots();
    expect(spots).toHaveLength(6);
    expect(spots.filter((s) => s.team === 0 && s.seat !== null)).toHaveLength(2);
    expect(spots.filter((s) => s.team === 1 && s.seat !== null)).toHaveLength(1);
    const characters = spots.map((s) => s.build);
    expect(new Set(characters).size).toBe(6);
  });

  it("gives each build to one player only", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.connect(2);
    expect(lobby.pick(1, "big")).toBe(true);
    expect(lobby.pick(2, "big")).toBe(false);
    expect(lobby.taken(2)).toEqual(["big"]);
  });

  it("keeps three a side when the host moves a player onto a full team", () => {
    const lobby = new Lobby();
    const builds = ["shooter", "lockdown", "allround", "dunker", "big", "playmaker"] as const;
    builds.forEach((build, i) => readyPlayer(lobby, i + 1, build));
    const team0 = () => lobby.connectedSeats.filter((s) => lobby.seats.get(s)!.team === 0);
    expect(team0()).toHaveLength(3);
    const mover = lobby.connectedSeats.find((s) => lobby.seats.get(s)!.team === 1)!;
    lobby.setTeam(mover, 0);
    expect(team0()).toHaveLength(3);
    expect(lobby.seats.get(mover)!.team).toBe(0);
    expect(lobby.spots().every((s) => s.seat !== null)).toBe(true);
  });

  it("leaves a player who is still choosing out of the game", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "allround");
    lobby.connect(2);
    expect(lobby.spots().filter((s) => s.seat !== null).map((s) => s.seat)).toEqual([1]);
  });

  it("remembers a dropped player's team and pick", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "dunker");
    lobby.setTeam(1, 1);
    lobby.disconnect(1);
    lobby.connect(1);
    expect(lobby.seats.get(1)!.team).toBe(1);
    expect(lobby.seats.get(1)!.pick).toBe("dunker");
  });

  it("with computer players off, fields only the people: one on one", () => {
    const lobby = new Lobby();
    lobby.setBots(false);
    readyPlayer(lobby, 1, "shooter");
    expect(lobby.startBlock()).toBe("oneSided");
    readyPlayer(lobby, 2, "lockdown");
    const entries = lobby.entries();
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.seat !== null)).toBe(true);
    expect(new Set(entries.map((e) => e.team))).toEqual(new Set([0, 1]));
    expect(lobby.startBlock()).toBeNull();
  });

  it("with computer players off, lets one team have more players than the other", () => {
    const lobby = new Lobby();
    lobby.setBots(false);
    (["shooter", "lockdown", "allround"] as const).forEach((build, i) => readyPlayer(lobby, i + 1, build));
    lobby.setTeam(2, 0);
    const spots = lobby.spots();
    expect(spots.filter((s) => s.team === 0)).toHaveLength(3);
    expect(spots.filter((s) => s.team === 1)).toHaveLength(0);
    expect(lobby.startBlock()).toBe("oneSided");
    lobby.setTeam(2, 1);
    expect(lobby.spots().map((s) => s.team).sort()).toEqual([0, 0, 1]);
    expect(lobby.startBlock()).toBeNull();
  });

  it("fills back to three a side when computer players come back on", () => {
    const lobby = new Lobby();
    lobby.setBots(false);
    readyPlayer(lobby, 1, "shooter");
    lobby.setBots(true);
    expect(lobby.spots()).toHaveLength(6);
    expect(lobby.startBlock()).toBeNull();
  });

  it("cannot start with nobody ready", () => {
    expect(new Lobby().startBlock()).toBe("empty");
  });
});
