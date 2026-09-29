import { describe, expect, it } from "vitest";
import { lineupProblem } from "../engine/lineup";
import { Lobby } from "./lobby";

/** A lobby with these seats joined, each with a star picked and ready. */
function readyLobby(picks: [number, "gunslinger" | "speedster" | "powerback" | "routerunner" | "scrambler" | "lockdown"][]): Lobby {
  const lobby = new Lobby();
  for (const [seat, star] of picks) {
    lobby.connect(seat);
    lobby.pick(seat, star);
    lobby.setReady(seat, true);
  }
  return lobby;
}

describe("the football lobby", () => {
  it("gives each star to one player only", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    lobby.connect(2);
    expect(lobby.pick(1, "gunslinger")).toBe(true);
    expect(lobby.pick(2, "gunslinger")).toBe(false);
    expect(lobby.taken(2)).toEqual(["gunslinger"]);
  });

  it("puts ready players on the smaller side and makes the first on a side its QB", () => {
    const lobby = readyLobby([[1, "gunslinger"], [2, "speedster"], [3, "routerunner"]]);
    expect(lobby.seats.get(1)!.team).toBe(0);
    expect(lobby.seats.get(2)!.team).toBe(1);
    expect(lobby.seats.get(3)!.team).toBe(0);
    expect(lobby.seats.get(1)!.role).toBe("qb");
    expect(lobby.seats.get(2)!.role).toBe("qb");
    expect(lobby.seats.get(3)!.role).toBe("runner");
  });

  it("swaps the QB when the host picks another one, and keeps a lone player at QB", () => {
    const lobby = readyLobby([[1, "gunslinger"], [2, "speedster"], [3, "routerunner"]]);
    expect(lobby.setRole(3, "qb")).toBe(true);
    expect(lobby.seats.get(3)!.role).toBe("qb");
    expect(lobby.seats.get(1)!.role).toBe("runner");
    expect(lobby.setRole(3, "runner")).toBe(true);
    expect(lobby.seats.get(1)!.role).toBe("qb");
    expect(lobby.setRole(2, "runner")).toBe(false);
    expect(lobby.seats.get(2)!.role).toBe("qb");
  });

  it("hands the QB job on when the QB moves to the other side", () => {
    const lobby = readyLobby([[1, "gunslinger"], [2, "speedster"], [3, "routerunner"]]);
    expect(lobby.setTeam(1, 1)).toBe(true);
    expect(lobby.seats.get(3)!.role).toBe("qb");
    expect(lobby.seats.get(1)!.role).toBe("runner");
    expect(lobby.seats.get(2)!.role).toBe("qb");
  });

  it("refuses a fourth player on a side", () => {
    const lobby = readyLobby([[1, "gunslinger"], [2, "speedster"], [3, "routerunner"], [4, "lockdown"]]);
    for (const seat of [1, 2, 3]) lobby.setTeam(seat, 0);
    expect(lobby.setTeam(4, 0)).toBe(false);
  });

  it("fills a playable line up with computers in the stars nobody picked", () => {
    const lobby = readyLobby([[1, "gunslinger"], [2, "speedster"]]);
    lobby.setTeam(2, 0);
    lobby.setRole(2, "qb");
    const lineup = lobby.lineup();
    expect(lineupProblem(lineup)).toBeNull();
    expect(lineup).toHaveLength(6);
    expect(lineup.find((e) => e.role === "qb" && e.team === 0)!.seat).toBe(2);
    expect(lineup.filter((e) => e.team === 1).every((e) => e.seat === null)).toBe(true);
    const stars = lineup.map((e) => e.build);
    expect(new Set(stars).size).toBe(6);
  });

  it("never fields the same star twice, lending out the stars of people not in the game", () => {
    const lobby = readyLobby([[1, "gunslinger"], [2, "speedster"]]);
    lobby.setTeam(2, 0);
    lobby.setReady(2, false);
    const stars = lobby.lineup().map((e) => e.build);
    expect(new Set(stars).size).toBe(6);
    expect(stars).toContain("speedster");
  });

  it("puts a ready runner at QB when the side's QB is not ready yet", () => {
    const lobby = readyLobby([[1, "gunslinger"], [2, "speedster"]]);
    lobby.setTeam(2, 0);
    lobby.setReady(1, false);
    const lineup = lobby.lineup();
    expect(lineupProblem(lineup)).toBeNull();
    expect(lineup.find((e) => e.role === "qb" && e.team === 0)!.seat).toBe(2);
  });

  it("waits for one ready player before a match can start", () => {
    const lobby = new Lobby();
    lobby.connect(1);
    expect(lobby.startBlock()).toBe("empty");
    lobby.pick(1, "gunslinger");
    lobby.setReady(1, true);
    expect(lobby.startBlock()).toBeNull();
  });

  it("frees a star while its phone is away, and clears the pick if someone takes it", () => {
    const lobby = readyLobby([[1, "gunslinger"]]);
    lobby.disconnect(1);
    lobby.connect(2);
    expect(lobby.pick(2, "gunslinger")).toBe(true);
    lobby.connect(1);
    expect(lobby.seats.get(1)!.pick).toBeNull();
    expect(lobby.seats.get(1)!.ready).toBe(false);
  });
});
