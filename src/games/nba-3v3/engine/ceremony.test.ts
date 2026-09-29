import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import { Ceremony, CEREMONY, CEREMONY_SPOT, captainOf, hopHeight, mateSpot } from "./ceremony";
import { Match, type Entry } from "./match";

const ENTRIES: Entry[] = BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 2 ? 1 : null }));

function finished(): Match {
  const m = new Match({ entries: ENTRIES, seed: 3 });
  m.phase = "over";
  m.winner = 0;
  m.score = [11, 6];
  return m;
}

describe("trophy ceremony", () => {
  it("hands the trophy to the winners' top scorer, a person first on a tie", () => {
    const m = finished();
    m.athletes[0]!.box.points = 4;
    m.athletes[2]!.box.points = 4;
    m.athletes[4]!.box.points = 3;
    expect(captainOf(m.athletes, 0)?.id).toBe(2);
    m.athletes[4]!.box.points = 7;
    expect(captainOf(m.athletes, 0)?.id).toBe(4);
  });

  it("cuts the winners to centre court with the captain in the middle", () => {
    const m = finished();
    m.athletes[4]!.box.points = 9;
    const c = new Ceremony(m);
    c.stage(m);
    const captain = m.athletes[4]!;
    expect(captain.x).toBeCloseTo(CEREMONY_SPOT.x);
    expect(captain.z).toBeCloseTo(CEREMONY_SPOT.z);
    expect(c.mates).toEqual([0, 2]);
    expect(c.losers).toEqual([1, 3, 5]);
    expect(m.ball.holder).toBeNull();
    // Nobody stands on anyone: the winners spread out, the losers stand back down the floor.
    for (const id of c.losers) expect(m.athletes[id]!.z).toBeLessThan(CEREMONY_SPOT.z - 3);
  });

  it("walks the teammates in close once the trophy is up, and they jump", () => {
    const m = finished();
    const c = new Ceremony(m);
    c.stage(m);
    const mate = m.athletes[c.mates[0]!]!;
    const before = Math.hypot(mate.x - CEREMONY_SPOT.x, mate.z - CEREMONY_SPOT.z);
    let highest = 0;
    for (let i = 0; i < 60 * (CEREMONY.up + 2); i++) {
      c.step(m, 1 / 60);
      if (c.t < CEREMONY.up) expect(mate.y).toBe(0);
      else highest = Math.max(highest, mate.y);
    }
    const after = Math.hypot(mate.x - CEREMONY_SPOT.x, mate.z - CEREMONY_SPOT.z);
    const want = mateSpot(0, true);
    expect(after).toBeLessThan(before);
    expect(Math.hypot(mate.x - want.x, mate.z - want.z)).toBeLessThan(0.05);
    expect(highest).toBeGreaterThan(0.15);
  });

  it("moves from the cup to the names to the box scores", () => {
    const c = new Ceremony(finished());
    expect(c.stageName).toBe("cup");
    c.t = CEREMONY.up + 0.1;
    expect(c.stageName).toBe("raised");
    c.t = CEREMONY.stats;
    expect(c.stageName).toBe("stats");
    expect(hopHeight(CEREMONY.up - 0.5, 1)).toBe(0);
  });
});
