import { describe, expect, it } from "vitest";
import { tailSpot } from "./guard";
import { jukeFor } from "./juke";
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

  it("has a cooldown, and spamming makes each juke slower", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    m.press(qb.id, "juke");
    const first = qb.action.kind === "juke" ? qb.action.dur : 0;
    run(m, 0.1);
    m.press(qb.id, "juke");
    expect(qb.action.kind === "juke" ? qb.action.t : 0).toBeGreaterThan(0);
    let last = first;
    for (let i = 0; i < 4; i++) {
      run(m, 1.2);
      m.press(qb.id, "juke");
      if (qb.action.kind === "juke") last = qb.action.dur;
    }
    expect(last).toBeGreaterThan(first);
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
    // Clear the defender lined up across from the receiver out of the way.
    bySeat(m, 3).z = 20;
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

  it("is mostly picked off, never cleanly caught, with a defender standing in front of the target", () => {
    let picks = 0;
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
      // He reads it and breaks on the ball; his hands decide, and a ball off them may go anywhere.
      expect(events.find((e) => e.type === "throw")).toMatchObject({ intercepting: true });
      if (m.carrier() === d) picks++;
      expect(events.some((e) => e.type === "catch" && e.id === wr.id && !events.some((t) => t.type === "tip"))).toBe(false);
    }
    expect(picks).toBeGreaterThanOrEqual(6);
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
