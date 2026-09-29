import { describe, expect, it } from "vitest";
import { Match } from "../engine/match";
import { BOTS } from "../engine/test-helpers";
import { playerOfTheGame, resultRows } from "./results";

describe("the end screen's stats", () => {
  it("lists the six stars, winners first, the best line on top", () => {
    const m = new Match({ entries: BOTS, seed: 1, firstOffense: 0 });
    m.winner = 1;
    m.athletes[1]!.stats.touchdowns = 2;
    m.athletes[1]!.stats.recYards = 40;
    m.athletes[6]!.stats.tackles = 2;
    m.athletes[7]!.stats.interceptions = 1;
    const rows = resultRows(m, new Map());
    expect(rows).toHaveLength(6);
    expect(rows.slice(0, 3).every((r) => r.team === 1)).toBe(true);
    expect(rows[0]!.interceptions).toBe(1);
    expect(playerOfTheGame(rows)!.id).toBe(1);
  });

  it("names a phone's player by their name and a computer's by the star", () => {
    const m = new Match({ entries: BOTS.map((e, i) => (i === 0 ? { ...e, seat: 3 } : e)), seed: 1 });
    const rows = resultRows(m, new Map([[3, "Sam"]]));
    expect(rows.find((r) => r.seat === 3)!.name).toBe("Sam");
    expect(rows.find((r) => r.character === "banks")!.name).toBe("Tyrell Banks");
  });

  it("has no player of the game when nobody did anything", () => {
    const m = new Match({ entries: BOTS, seed: 1 });
    expect(playerOfTheGame(resultRows(m, new Map()))).toBeNull();
  });
});
