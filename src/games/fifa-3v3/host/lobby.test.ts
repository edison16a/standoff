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
    expect(lobby.pick(1, "playmaker")).toBe(true);
    expect(lobby.pick(2, "playmaker")).toBe(false);
    expect(lobby.taken(2)).toEqual(["playmaker"]);
  });

  it("frees a star while its player is away, and takes it back from them if someone grabs it", () => {
    const lobby = joined(1, 2);
    lobby.pick(1, "striker");
    lobby.disconnect(1);
    expect(lobby.pick(2, "striker")).toBe(true);
    lobby.connect(1);
    expect(lobby.seats.get(1)!.pick).toBeNull();
  });

  it("puts ready players on the smaller side, and the host can move them", () => {
    const lobby = joined(1, 2, 3);
    lobby.pick(1, "playmaker");
    lobby.pick(2, "striker");
    lobby.pick(3, "allrounder");
    for (const seat of [1, 2, 3]) lobby.setReady(seat, true);
    expect([1, 2, 3].map((s) => lobby.seats.get(s)!.team)).toEqual([0, 1, 0]);
    expect(lobby.setTeam(3, 1)).toBe(true);
    expect(lobby.teamCount(1)).toBe(2);
  });

  it("never puts more than three on a side", () => {
    const lobby = joined(1, 2, 3, 4);
    const stars = ["playmaker", "striker", "allrounder", "defender"] as const;
    stars.forEach((star, i) => {
      lobby.pick(i + 1, star);
      lobby.setTeam(i + 1, 0);
    });
    expect(lobby.teamCount(0)).toBe(3);
    expect(lobby.seats.get(4)!.team).toBeNull();
  });

  it("fills each side to three with computer players in the stars nobody picked", () => {
    const lobby = joined(1);
    lobby.pick(1, "playmaker");
    lobby.setReady(1, true);
    const lineup = lobby.entrants();
    expect(lineup).toHaveLength(6);
    expect(lineup.filter((e) => e.team === 0)).toHaveLength(3);
    expect(lineup[0]).toEqual({ team: 0, build: "playmaker", seat: 1 });
    expect(new Set(lineup.map((e) => e.build)).size).toBe(6);
    expect(lineup.filter((e) => e.seat === null)).toHaveLength(5);
  });

  it("leaves out players who are not ready yet", () => {
    const lobby = joined(1, 2);
    lobby.pick(1, "playmaker");
    lobby.pick(2, "striker");
    lobby.setReady(1, true);
    expect(lobby.players).toEqual([1]);
  });

  it("with computer players off, fields only the people: one on one", () => {
    const lobby = joined(1, 2);
    lobby.setBots(false);
    lobby.pick(1, "playmaker");
    lobby.setReady(1, true);
    expect(lobby.startBlock()).toBe("oneSided");
    lobby.pick(2, "striker");
    lobby.setReady(2, true);
    const lineup = lobby.entrants();
    expect(lineup).toHaveLength(2);
    expect(lineup.map((e) => e.team).sort()).toEqual([0, 1]);
    expect(lineup.every((e) => e.seat !== null)).toBe(true);
    expect(lobby.startBlock()).toBeNull();
  });

  it("with computer players off, lets one side have more players than the other", () => {
    const lobby = joined(1, 2, 3);
    lobby.setBots(false);
    (["playmaker", "striker", "allrounder"] as const).forEach((star, i) => {
      lobby.pick(i + 1, star);
      lobby.setTeam(i + 1, i === 2 ? 1 : 0);
      lobby.setReady(i + 1, true);
    });
    const lineup = lobby.entrants();
    expect(lineup.filter((e) => e.team === 0)).toHaveLength(2);
    expect(lineup.filter((e) => e.team === 1)).toHaveLength(1);
    expect(lobby.startBlock()).toBeNull();
  });

  it("lets the host pick roles, swapping with whoever had the role", () => {
    const lobby = joined(1, 2);
    lobby.pick(1, "playmaker");
    lobby.pick(2, "striker");
    lobby.setTeam(1, 1);
    lobby.setTeam(2, 1);
    lobby.setReady(1, true);
    lobby.setReady(2, true);
    expect(lobby.seats.get(1)!.role).toBe("striker");
    expect(lobby.seats.get(2)!.role).toBe("left");
    lobby.setRole(2, "striker");
    expect(lobby.seats.get(2)!.role).toBe("striker");
    expect(lobby.seats.get(1)!.role).toBe("left");
    // Blue attacks to the left, so its left wing is the third place (the near side).
    const blue = lobby.lineup().filter((e) => e.team === 1);
    expect(blue.map((e) => e.role)).toEqual(["striker", "right", "left"]);
    expect(blue[0]!.seat).toBe(2);
    expect(blue[2]!.seat).toBe(1);
  });

  it("needs a ready player before anything can start", () => {
    expect(joined(1).startBlock()).toBe("empty");
  });

  it("never gives two on the pitch the same build, even with someone still choosing", () => {
    const lobby = joined(1, 2);
    lobby.pick(1, "striker");
    lobby.pick(2, "winger");
    lobby.setReady(1, true);
    const builds = lobby.entrants().map((e) => e.build);
    expect(builds).toHaveLength(6);
    expect(new Set(builds).size).toBe(6);
    // Nobody ready yet: the lobby's preview of computer players is still six different builds.
    expect(new Set(joined(3).lineup().map((e) => e.build)).size).toBe(6);
  });
});
