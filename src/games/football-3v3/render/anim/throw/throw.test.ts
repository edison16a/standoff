import { describe, expect, it } from "vitest";
import { THROW_KINDS, THROW_MOVES } from "../../../engine/throw-preset";
import { JOINTS, neutral } from "../pose";
import { throwKeys, throwMotion } from "./index";

describe("throwing motions", () => {
  it("puts the arm over the top on the engine's release frame for every motion", () => {
    for (const kind of THROW_KINDS) {
      const { release, dur } = THROW_MOVES[kind];
      const keys = throwKeys(kind);
      expect(keys.some(([t]) => t === release)).toBe(true);
      const loaded = throwMotion(kind, release * 0.6, dur, neutral);
      const out = throwMotion(kind, release, dur, neutral);
      // Cocked by the ear first, then whipped forward and up.
      expect(loaded.shRZ).toBeGreaterThan(1.2);
      expect(out.shRX).toBeLessThan(loaded.shRX - 0.9);
      for (let t = 0; t <= dur; t += 0.02) expect(JOINTS.every((j) => Number.isFinite(throwMotion(kind, t, dur, neutral)[j]))).toBe(true);
    }
  });

  it("stands side on to load and comes through square or past it", () => {
    for (const kind of ["flick", "bomb", "pressure"] as const) {
      const { release, dur } = THROW_MOVES[kind];
      expect(throwMotion(kind, release * 0.6, dur, neutral).yaw).toBeLessThan(-0.3);
      expect(throwMotion(kind, release, dur, neutral).yaw).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it("keeps the stride under a throw on the run and leans back off a rush", () => {
    const stride = { ...neutral(), hipLX: -0.9, kneeR: 1.4 };
    const onRun = throwMotion("run", 0.1, THROW_MOVES.run.dur, () => stride);
    expect(onRun.hipLX).toBe(-0.9);
    expect(onRun.kneeR).toBe(1.4);
    expect(throwMotion("pressure", THROW_MOVES.pressure.release, THROW_MOVES.pressure.dur, neutral).pitch).toBeLessThan(-0.1);
    // The bomb's long stride: the front leg reaches farther than on a flick.
    expect(throwMotion("bomb", THROW_MOVES.bomb.release, 1, neutral).hipLX).toBeLessThan(throwMotion("flick", THROW_MOVES.flick.release, 1, neutral).hipLX);
  });
});
