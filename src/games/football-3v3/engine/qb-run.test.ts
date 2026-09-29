import { describe, expect, it } from "vitest";
import { topSpeed } from "./body";
import { FIELD, yardToX } from "./field";
import { Match } from "./match";
import { canRun, paceOf } from "./qb-run";
import { seatStatus } from "./status";
import { BOTS, bySeat, peopleMatch, run, snap } from "./test-helpers";
import { QB_PACE } from "./tuning";

/** How far the QB gets in `seconds` running straight across the field. */
function across(m: Match, seconds: number): number {
  const qb = bySeat(m, 0);
  const from = { x: qb.x, z: qb.z };
  m.setMove(qb.id, { x: 0, z: 1 });
  run(m, seconds);
  return Math.hypot(qb.x - from.x, qb.z - from.z);
}

describe("the QB as a passer", () => {
  it("is slowest at the snap and still clearly slower once settled", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    expect(paceOf(m, qb)).toBeCloseTo(QB_PACE.early, 1);
    run(m, QB_PACE.ramp + 0.5);
    expect(paceOf(m, qb)).toBeCloseTo(QB_PACE.late, 5);
    expect(paceOf(m, qb)).toBeLessThan(0.85);
    // Nobody else is slowed.
    expect(paceOf(m, bySeat(m, 1))).toBe(1);
    expect(paceOf(m, bySeat(m, 3))).toBe(1);
  });

  it("tops out well under a runner with the same legs", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    expect(topSpeed(qb, true, paceOf(m, qb))).toBeLessThan(topSpeed(qb, true) * 0.6);
  });

  it("throws as well shuffling back as standing still", () => {
    const caught = (seed: number, shuffle: boolean) => {
      const m = peopleMatch({ seed });
      snap(m);
      const qb = bySeat(m, 0);
      const wr = bySeat(m, 1);
      m.setMove(wr.id, { x: m.sign, z: 0 });
      m.setMove(bySeat(m, 3).id, { x: 0, z: -Math.sign(wr.z || 1) });
      m.setMove(qb.id, shuffle ? { x: -m.sign, z: 0 } : { x: 0, z: 0 });
      run(m, 1.6);
      m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
      run(m, 0.05);
      m.setAim(qb.id, null);
      const events = run(m, 3, (mm) => mm.phase !== "live" || mm.play?.caughtBy !== null);
      return events.some((e) => e.type === "catch" && e.id === wr.id);
    };
    let still = 0;
    let moving = 0;
    for (let seed = 1; seed <= 16; seed++) {
      if (caught(seed, false)) still++;
      if (caught(seed, true)) moving++;
    }
    expect(still).toBeGreaterThanOrEqual(14);
    expect(moving).toBeGreaterThanOrEqual(14);
  });
});

describe("the Run button", () => {
  it("makes the QB a runner: no throw, the runner's pad, full speed", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    expect(seatStatus(m, 0)?.canRun).toBe(true);
    const slow = across(m, 0.8);
    m.press(qb.id, "run");
    const s = seatStatus(m, 0)!;
    expect(s.pad).toBe("runner");
    expect(s.canThrow).toBe(false);
    expect(s.canRun).toBe(false);
    expect(paceOf(m, qb)).toBe(1);
    expect(across(m, 0.8)).toBeGreaterThan(slow * 1.3);
    // The throw stick does nothing now.
    m.setAim(qb.id, { x: m.sign, z: 0 });
    m.setAim(qb.id, null);
    expect(m.play?.passed).toBe(false);
  });

  it("gives the QB the runner's dive", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    m.press(qb.id, "run");
    run(m, 0.3);
    m.press(qb.id, "dive");
    expect(qb.action.kind).toBe("dive");
  });

  it("takes the pitch away on a run call", () => {
    const m = peopleMatch();
    const qb = bySeat(m, 0);
    m.choose(qb.id, "run");
    m.press(qb.id, "hike");
    run(m, 1, () => m.carrier() === qb);
    expect(seatStatus(m, 0)?.canPitch).toBe(true);
    m.press(qb.id, "run");
    expect(seatStatus(m, 0)?.canPitch).toBe(false);
    m.press(qb.id, "pass");
    expect(qb.action.kind).not.toBe("throw");
  });

  it("is not there before the snap, after a throw, or for a runner", () => {
    const m = peopleMatch();
    const qb = bySeat(m, 0);
    expect(canRun(m, qb)).toBe(false);
    snap(m);
    expect(canRun(m, bySeat(m, 1))).toBe(false);
    m.setAim(qb.id, { x: m.sign, z: 0 });
    run(m, 0.05);
    m.setAim(qb.id, null);
    run(m, 0.5);
    expect(canRun(m, qb)).toBe(false);
  });

  it("is pressed for him when he crosses the line", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    // Put him just past the line, round the end of his own linemen.
    qb.x = yardToX(m.offense, m.drive.los) + m.sign * 1.5;
    qb.z = FIELD.halfWidth - 4;
    run(m, 0.05);
    expect(m.play?.qbRun).toBe(true);
    expect(seatStatus(m, 0)?.pad).toBe("runner");
  });

  it("is used by a computer QB when nobody gets open", () => {
    const m = new Match({ entries: BOTS.filter((e) => e.role === "qb"), seed: 5, firstOffense: 0 });
    // A computer QB calls and hikes by itself once its windows run out.
    run(m, 25, (mm) => mm.phase === "live");
    expect(m.play?.call).toBe("throw");
    run(m, 10, (mm) => mm.play?.qbRun === true || mm.phase !== "live");
    expect(m.play?.qbRun).toBe(true);
  });
});
