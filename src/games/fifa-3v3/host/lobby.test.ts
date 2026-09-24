import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

function joined(...seats: number[]): Lobby {
  const lobby = new Lobby();
  for (const seat of seats) lobby.connect(seat);
  return lobby;
}

describe("the lobby", () => {
  it("gives each star to one player only", () => {
    const lobby = joined(1, 2);
    expect(lobby.pick(1, "messi")).toBe(true);
    expect(lobby.pick(2, "messi")).toBe(false);
    expect(lobby.taken(2)).toEqual(["messi"]);
  });

  it("frees a star while its player is away, and takes it back from them if someone grabs it", () => {
    const lobby = joined(1, 2);
    lobby.pick(1, "ronaldo");
    lobby.disconnect(1);
    expect(lobby.pick(2, "ronaldo")).toBe(true);
    lobby.connect(1);
    expect(lobby.seats.get(1)!.pick).toBeNull();
  });

  it("puts ready players on the smaller side, and the host can move them", () => {
    const lobby = joined(1, 2, 3);
    lobby.pick(1, "messi");
    lobby.pick(2, "kane");
    lobby.pick(3, "salah");
    for (const seat of [1, 2, 3]) lobby.setReady(seat, true);
    expect([1, 2, 3].map((s) => lobby.seats.get(s)!.team)).toEqual([0, 1, 0]);
    expect(lobby.setTeam(3, 1)).toBe(true);
    expect(lobby.teamCount(1)).toBe(2);
  });

  it("never puts more than three on a side", () => {
    const lobby = joined(1, 2, 3, 4);
    const stars = ["messi", "kane", "salah", "yamal"] as const;
    stars.forEach((star, i) => {
      lobby.pick(i + 1, star);
      lobby.setTeam(i + 1, 0);
    });
    expect(lobby.teamCount(0)).toBe(3);
    expect(lobby.seats.get(4)!.team).toBeNull();
  });

  it("fills each side to three with computer players in the stars nobody picked", () => {
    const lobby = joined(1);
    lobby.pick(1, "messi");
    lobby.setReady(1, true);
    const lineup = lobby.entrants();
    expect(lineup).toHaveLength(6);
    expect(lineup.filter((e) => e.team === 0)).toHaveLength(3);
    expect(lineup[0]).toEqual({ team: 0, character: "messi", seat: 1 });
    expect(new Set(lineup.map((e) => e.character)).size).toBe(6);
    expect(lineup.filter((e) => e.seat === null)).toHaveLength(5);
  });

  it("leaves out players who are not ready yet", () => {
    const lobby = joined(1, 2);
    lobby.pick(1, "messi");
    lobby.pick(2, "kane");
    lobby.setReady(1, true);
    expect(lobby.players).toEqual([1]);
  });
});
