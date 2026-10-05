import { describe, expect, it } from "vitest";
import { createAthlete } from "./body";
import { Match } from "./match";
import { pickBack } from "./run-play";
import { seatStatus } from "./status";
import { BOTS, bySeat, peopleMatch, run } from "./test-helpers";

/** Calls a run and hikes, then steps until the QB has the ball. */
function runSnap(m: Match): void {
  const qb = m.qbOf(m.offense);
  m.choose(qb.id, "run");
  m.press(qb.id, "hike");
  run(m, 1, () => m.carrier() === qb);
}

describe("the run call", () => {
  it("is offered between Throw and Kick", () => {
    expect(seatStatus(peopleMatch(), 0)?.choose?.options).toEqual(["throw", "run", "kick"]);
  });

  it("lines the back up beside the QB", () => {
    const m = peopleMatch();
    m.choose(bySeat(m, 0).id, "run");
    const qb = bySeat(m, 0);
    const back = bySeat(m, 1);
    expect(m.play?.back).toBe(back.id);
    expect(Math.hypot(back.x - qb.x, back.z - qb.z)).toBeLessThan(4);
  });

  it("gives a person's runner the carry before a computer one", () => {
    const athletes = [createAthlete(0, 0, "qb", 0, "gunslinger", 1), createAthlete(1, 0, "runner", 0, "speedster", null), createAthlete(2, 0, "runner", 1, "powerback", 4)];
    expect(pickBack(athletes, 0)).toBe(2);
    athletes[2]!.auto = true;
    expect(pickBack(athletes, 0)).toBe(1);
  });

  it("swaps the throw stick for Pass and rings the back", () => {
    const m = peopleMatch();
    runSnap(m);
    const s = seatStatus(m, 0)!;
    expect(s.runPlay).toBe(true);
    expect(s.canThrow).toBe(false);
    expect(s.canPitch).toBe(true);
    run(m, 0.05);
    expect(m.play?.target).toBe(bySeat(m, 1).id);
  });

  it("pitches to the back, who runs with it as a rush", () => {
    const m = peopleMatch();
    runSnap(m);
    const qb = bySeat(m, 0);
    const back = bySeat(m, 1);
    m.setMove(back.id, { x: m.sign, z: 0 });
    m.press(qb.id, "pass");
    const events = run(m, 2, () => m.carrier() === back);
    expect(events.some((e) => e.type === "pitch")).toBe(true);
    expect(events.some((e) => e.type === "takePitch" && e.id === back.id)).toBe(true);
    expect(m.carrier()).toBe(back);
    expect(m.play?.caughtBy).toBeNull();
    expect(qb.stats.completions + qb.stats.attempts + back.stats.catches).toBe(0);
    // Out of bounds ends it; the yards are rushing yards.
    m.setMove(back.id, { x: m.sign, z: Math.sign(back.z || 1) });
    run(m, 8, () => m.phase !== "live");
    expect(back.stats.recYards).toBe(0);
    expect(back.stats.rushYards).not.toBe(0);
  });

  it("allows one pitch, only after the snap, and only on a run call", () => {
    const m = peopleMatch();
    const qb = bySeat(m, 0);
    m.choose(qb.id, "run");
    m.press(qb.id, "pass");
    expect(m.play?.pitched).toBe(false);
    const t = peopleMatch();
    t.choose(t.qbOf(t.offense).id, "throw");
    t.press(t.qbOf(t.offense).id, "hike");
    run(t, 1, () => t.carrier() !== null);
    t.press(t.qbOf(t.offense).id, "pass");
    run(t, 0.5);
    expect(t.play?.pitched).toBe(false);
    expect(t.ball.state).toBe("held");
  });

  it("is called by computer QBs now and then", () => {
    const calls = [4, 5, 6].flatMap((seed) => {
      const m = new Match({ entries: BOTS, seed, level: "medium", quarterSeconds: 45 });
      return run(m, 240).filter((e) => e.type === "call").map((e) => (e.type === "call" ? e.call : null));
    });
    expect(calls).toContain("run");
    expect(calls).toContain("throw");
  });
});
