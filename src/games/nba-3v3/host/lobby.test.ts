import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

function readyPlayer(lobby: Lobby, seat: number, character: Parameters<Lobby["pick"]>[1]): void {
  lobby.connect(seat);
  lobby.pick(seat, character);
  lobby.setReady(seat, true);
}

describe("the team lobby", () => {
  it("puts new players on the smaller team and fills the rest with computers", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "ashby");
    readyPlayer(lobby, 2, "whitlock");
    readyPlayer(lobby, 3, "vukmir");
    const spots = lobby.spots();
    expect(spots).toHaveLength(6);
    expect(spots.filter((s) => s.team === 0 && s.seat !== null)).toHaveLength(2);
    expect(spots.filter((s) => s.team === 1 && s.seat !== null)).toHaveLength(1);
    const characters = spots.map((s) => s.character);
    expect(new Set(characters).size).toBe(6);
  });

  it("gives each star to one player only", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.connect(2);
    expect(lobby.pick(1, "delacroix")).toBe(true);
    expect(lobby.pick(2, "delacroix")).toBe(false);
    expect(lobby.taken(2)).toEqual(["delacroix"]);
  });

  it("keeps three a side when the host moves a player onto a full team", () => {
    const lobby = new Lobby();
    const stars = ["ashby", "whitlock", "crane", "varelas", "vukmir", "zupan"] as const;
    stars.forEach((star, i) => readyPlayer(lobby, i + 1, star));
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
    readyPlayer(lobby, 1, "fontaine");
    lobby.connect(2);
    expect(lobby.spots().filter((s) => s.seat !== null).map((s) => s.seat)).toEqual([1]);
  });

  it("remembers a dropped player's team and pick", () => {
    const lobby = new Lobby();
    readyPlayer(lobby, 1, "mensah");
    lobby.setTeam(1, 1);
    lobby.disconnect(1);
    lobby.connect(1);
    expect(lobby.seats.get(1)!.team).toBe(1);
    expect(lobby.seats.get(1)!.pick).toBe("mensah");
  });
});
