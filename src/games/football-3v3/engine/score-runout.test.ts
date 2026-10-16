import { describe, expect, it } from "vitest";
import { adminTouchdown } from "./admin";
import { FIELD, xToYard, yardToX } from "./field";
import type { Match } from "./match";
import { RUNOUT, touchdownEnd } from "./score-runout";
import { peopleMatch, run, setDrive, snap } from "./test-helpers";
import { RULES, STEP } from "./tuning";
import type { Athlete } from "./types";

const speedOf = (a: { vx: number; vz: number }) => Math.hypot(a.vx, a.vz);

/** The QB snapped at the 90 and loose down the sideline past the line, running for the end zone with the stick held. */
function breakaway(m: Match): Athlete {
  setDrive(m, 0, 90);
  snap(m);
  const qb = m.qbOf(0);
  qb.x = yardToX(0, 93);
  qb.z = FIELD.halfWidth - 4;
  m.play!.qbRun = true;
  m.setMove(qb.id, { x: m.sign, z: 0 });
  return qb;
}

describe("a scorer runs it out before he celebrates", () => {
  it("keeps running over the line, eases off, then dances", () => {
    const m = peopleMatch({ level: "training" });
    const qb = breakaway(m);
    run(m, 6, () => m.phase !== "live");
    expect(m.phase).toBe("touchdown");
    expect(qb.action.kind).toBe("none");
    const atLine = speedOf(qb);
    expect(atLine).toBeGreaterThan(4);
    const lineX = qb.x;
    let last = atLine;
    let started: number | null = null;
    let pulledUpX = 0;
    while (m.phase === "touchdown" && (started === null || m.phaseT < started + 0.6)) {
      m.step(STEP);
      if (qb.action.kind === "celebrate" && started === null) {
        started = m.phaseT;
        pulledUpX = qb.x;
      }
      if (started === null) {
        // Slowing all the way, never speeding back up.
        expect(speedOf(qb)).toBeLessThanOrEqual(last + 0.05);
        last = speedOf(qb);
      }
    }
    expect(started).not.toBeNull();
    expect(started!).toBeGreaterThan(0.6);
    expect(last).toBeLessThan(RUNOUT.still + 0.1);
    // Still for his dance, though the thumb never let go.
    expect(speedOf(qb)).toBeLessThan(0.3);
    // He carried on into the end zone rather than stopping on the paint.
    expect((pulledUpX - lineX) * m.sign).toBeGreaterThan(2);
    expect(xToYard(0, pulledUpX)).toBeLessThan(110);
  });

  it("lets the break run on until his own celebration has had its time", () => {
    const m = peopleMatch({ level: "training" });
    breakaway(m);
    run(m, 6, () => m.phase !== "live");
    run(m, 3, () => m.play?.runout?.at !== null);
    const at = m.play!.runout!.at!;
    expect(touchdownEnd(m)).toBeCloseTo(Math.max(RULES.touchdownSeconds, at + RUNOUT.celebrate), 6);
  });

  it("celebrates at once when he scored standing still", () => {
    const m = peopleMatch();
    const qb = m.qbOf(m.offense);
    qb.vx = 0;
    qb.vz = 0;
    adminTouchdown(m, m.offense);
    m.step(STEP);
    expect(qb.action.kind).toBe("celebrate");
    expect(touchdownEnd(m)).toBe(RULES.touchdownSeconds);
  });

  it("plays the catch out in the end zone before the dance", () => {
    const m = peopleMatch({ level: "training" });
    setDrive(m, 0, 94);
    snap(m);
    const qb = m.qbOf(0);
    const slot = m.play!.runners.findIndex((id) => m.athletes[id]!.seat === 1);
    const wr = m.athletes[m.play!.runners[slot]!]!;
    // Standing in the end zone, open, away from the deep defender.
    wr.x = yardToX(0, 104);
    wr.z = 11;
    wr.vx = 0;
    wr.vz = 0;
    wr.bot.route = [];
    m.throwTo(qb.id, slot);
    run(m, 4, () => m.phase !== "live");
    expect(m.phase).toBe("touchdown");
    expect(m.carrier()).toBe(wr);
    // The catch is still in his hands, not cut short by the celebration.
    expect(wr.action.kind).toBe("none");
    expect(wr.catching).not.toBeNull();
    run(m, 3, () => wr.action.kind === "celebrate");
    expect(wr.action.kind).toBe("celebrate");
    expect(wr.catching).toBeNull();
  });
});
