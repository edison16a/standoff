import { describe, expect, it } from "vitest";
import { adminWin } from "./admin";
import { CEREMONY, CEREMONY_SPOT, captainOf, ceremonyTime, mateSpot } from "./ceremony";
import { peopleMatch, run } from "./test-helpers";
import { dist2 } from "./vec";
import { buildView } from "./view";

describe("the trophy presentation", () => {
  it("cuts in a few seconds after the final whistle and stands the winners at midfield", () => {
    const m = peopleMatch();
    adminWin(m, 1);
    run(m, CEREMONY.cut - 0.2);
    expect(ceremonyTime(m)).toBeNull();
    expect(buildView(m).ceremony).toBeNull();
    run(m, 0.4);
    const view = buildView(m);
    expect(view.ceremony?.team).toBe(1);
    const captain = m.athlete(m.ceremony!.captain!)!;
    expect(captain.team).toBe(1);
    expect(captain.role).not.toBe("lineman");
    expect(dist2(captain, CEREMONY_SPOT)).toBeLessThan(0.01);
    expect(view.athletes.find((a) => a.id === captain.id)!.ceremony).toBe("captain");
    // Every winner is close round the captain; every loser well away.
    for (const a of m.athletes) {
      const role = view.athletes[a.id]!.ceremony;
      if (a.team === 1) expect(dist2(a, CEREMONY_SPOT)).toBeLessThan(4.6);
      else expect(role).toBe("beaten");
      if (a.team === 0) expect(dist2(a, CEREMONY_SPOT)).toBeGreaterThan(8);
    }
  });

  it("hands the trophy to the best player on the day", () => {
    const m = peopleMatch();
    const runner = m.athletes.find((a) => a.team === 0 && a.role === "runner")!;
    runner.stats.touchdowns = 2;
    expect(captainOf(m, 0)?.id).toBe(runner.id);
    // With nothing done, a phone's QB lifts it.
    expect(captainOf(peopleMatch(), 0)?.role).toBe("qb");
  });

  it("brings the team mates in close once the trophy is up", () => {
    const m = peopleMatch();
    adminWin(m, 0);
    run(m, CEREMONY.cut + 0.5);
    const mate = m.athletes.find((a) => a.team === 0 && a.id !== m.ceremony!.captain && a.role !== "lineman")!;
    const before = dist2(mate, CEREMONY_SPOT);
    run(m, CEREMONY.up + 2);
    expect(dist2(mate, CEREMONY_SPOT)).toBeLessThan(before - 0.3);
    expect(dist2(mate, mateSpot(0, true))).toBeLessThan(0.05);
  });

  it("has no presentation after a tie", () => {
    const m = peopleMatch();
    m.phase = "over";
    m.phaseT = 0;
    run(m, CEREMONY.cut + 1);
    expect(ceremonyTime(m)).toBeNull();
    expect(m.ceremony).toBeNull();
  });
});
