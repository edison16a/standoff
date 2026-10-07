import { describe, expect, it } from "vitest";
import { tailSpot } from "./guard";
import { createAthlete } from "./body";
import { jukeCooling, jukeFor, startJuke } from "./juke";
import { TACKLE } from "./tuning";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";

/** A live play with the defender standing `gap` metres in front of the QB. */
function faceOff(gap: number) {
  const m = peopleMatch();
  snap(m);
  const qb = bySeat(m, 0);
  const d = bySeat(m, 3);
  d.x = qb.x + m.sign * gap;
  d.z = qb.z;
  return { m, qb, d };
}

describe("tackling", () => {
  it("does nothing when the ball carrier is out of reach", () => {
    const { m, d } = faceOff(TACKLE.range + 2);
    m.press(d.id, "tackle");
    expect(d.action.kind).toBe("none");
  });

  it("lunges and brings a standing QB down for a sack", () => {
    const { m, d } = faceOff(2);
    m.press(d.id, "tackle");
    expect(d.action.kind).toBe("lunge");
    const events = run(m, 1, () => m.phase === "dead");
    expect(events.find((e) => e.type === "tackle")).toMatchObject({ by: d.id, sack: true });
    expect(d.stats.tackles).toBe(1);
    expect(d.stats.sacks).toBe(1);
  });

  it("misses a runner mid juke and leaves the tackler down", () => {
    const { m, qb, d } = faceOff(2.2);
    m.press(qb.id, "juke");
    expect(qb.action.kind).toBe("juke");
    run(m, 0.1);
    m.press(d.id, "tackle");
    const events = run(m, 0.4);
    expect(events.some((e) => e.type === "missedTackle")).toBe(true);
    expect(m.phase).toBe("live");
    expect(d.action).toMatchObject({ kind: "down", cause: "missed" });
    run(m, TACKLE.missedDown * 0.5);
    expect(d.action.kind).toBe("down");
    run(m, TACKLE.missedDown);
    expect(d.action.kind).toBe("none");
  });
});

describe("jukes", () => {
  it("picks the move from the stick against the run", () => {
    const run = { x: 1, z: 0 };
    expect(jukeFor(run, { x: 0, z: 0 }).juke).toBe("spin");
    expect(jukeFor(run, { x: 1, z: 0.1 }).juke).toBe("spin");
    expect(jukeFor(run, { x: -1, z: 0 }).juke).toBe("back");
    expect(jukeFor(run, { x: 0, z: 1 })).toEqual({ juke: "side", side: 1 });
    expect(jukeFor(run, { x: 0, z: -1 })).toEqual({ juke: "side", side: -1 });
  });

  it("has a cooldown of about two seconds, shown as a share still to run", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    m.press(qb.id, "juke");
    expect(qb.action.kind).toBe("juke");
    expect(qb.jukeCd).toBeGreaterThan(1.5);
    expect(qb.jukeCd).toBeLessThan(2.5);
    expect(jukeCooling(qb)).toBe(1);
    run(m, 1.2);
    expect(jukeCooling(qb)).toBeGreaterThan(0);
    expect(jukeCooling(qb)).toBeLessThan(1);
    m.press(qb.id, "juke");
    expect(qb.action.kind).not.toBe("juke");
    run(m, 1.2);
    expect(jukeCooling(qb)).toBe(0);
    m.press(qb.id, "juke");
    expect(qb.action.kind).toBe("juke");
  });

  it("gives an agile player his juke back sooner", () => {
    const quick = { ...createAthlete(0, 0, "runner", 0, "routerunner", null), move: { x: 0, z: 1 } };
    const slow = { ...createAthlete(1, 0, "support", 0, null, null), move: { x: 0, z: 1 } };
    startJuke(quick, () => {});
    startJuke(slow, () => {});
    expect(quick.jukeCd).toBeLessThan(slow.jukeCd);
  });
});

describe("passing", () => {
  it("lights up the receiver under the throw stick", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    run(m, 0.05);
    expect(m.play?.target).toBe(wr.id);
  });

  it("completes a pass led to a receiver on the run", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    // Clear every defender who could play the ball out of the way.
    for (const d of m.athletes) if (d.team !== m.offense && d.role !== "lineman") d.z = 25;
    m.setMove(wr.id, { x: m.sign, z: 0 });
    run(m, 1.2);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    run(m, 0.05);
    m.setAim(qb.id, null);
    const events = run(m, 4, () => m.play?.caughtBy !== null || m.phase !== "live");
    expect(events.some((e) => e.type === "throw")).toBe(true);
    expect(m.play?.caughtBy).toBe(wr.id);
    expect(qb.stats.completions).toBe(1);
  });

  it("is mostly picked off or knocked away with a defender standing in front of the target", () => {
    let picks = 0;
    let plays = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const m = peopleMatch({ seed });
      snap(m);
      const qb = bySeat(m, 0);
      const wr = bySeat(m, 1);
      const d = bySeat(m, 3);
      d.x = wr.x - (wr.x - qb.x) * 0.1;
      d.z = wr.z - (wr.z - qb.z) * 0.1;
      m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
      run(m, 0.05);
      m.setAim(qb.id, null);
      const events = run(m, 3, () => m.phase !== "live" || (m.carrier() !== qb && m.carrier() !== null));
      // He reads it and breaks on the ball; the lane decides, and a ball off his hands may go anywhere.
      expect(events.find((e) => e.type === "throw")).toMatchObject({ intercepting: true });
      if (m.carrier() === d) picks++;
      if (events.some((e) => (e.type === "tip" || e.type === "breakUp" || e.type === "intercept") && e.id === d.id)) plays++;
    }
    expect(picks).toBeGreaterThanOrEqual(3);
    expect(plays).toBeGreaterThanOrEqual(7);
  });

  it("never gives the ball to a defender on Guard", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    const d = bySeat(m, 3);
    d.x = wr.x - (wr.x - qb.x) * 0.1;
    d.z = wr.z - (wr.z - qb.z) * 0.1;
    m.press(d.id, "guard");
    expect(d.guard).toBe(wr.id);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    run(m, 0.05);
    m.setAim(qb.id, null);
    const events = run(m, 3, () => m.phase !== "live");
    expect(events.some((e) => e.type === "intercept")).toBe(false);
  });

  it("tails a receiver on Guard", () => {
    const m = peopleMatch();
    snap(m);
    const wr = bySeat(m, 1);
    const d = bySeat(m, 3);
    m.press(d.id, "guard");
    m.setMove(wr.id, { x: m.sign, z: 0 });
    run(m, 3);
    const spot = tailSpot(wr);
    expect(Math.hypot(d.x - spot.x, d.z - spot.z)).toBeLessThan(2.5);
  });
});
