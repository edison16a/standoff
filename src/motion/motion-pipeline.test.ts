import { describe, expect, it } from "vitest";
import type { StrikeAction } from "@/shared/protocol";
import { DEFAULT_TUNING } from "@/shared/tuning";
import { quatFromDeviceEuler, vec } from "./math3d";
import { MotionPipeline } from "./motion-pipeline";

const STEP = 1000 / 60;

/**
 * A phone lying flat, top edge pointing north. In that pose device y is
 * earth north, so forward acceleration along the strip is device y.
 */
function flatPhone() {
  const strikes: StrikeAction[] = [];
  const pipeline = new MotionPipeline(DEFAULT_TUNING, (action) => strikes.push(action));
  pipeline.onOrientation(quatFromDeviceEuler(0, 0, 0));
  pipeline.calibrate();
  let t = 0;
  const feed = (forward: number[]) => {
    for (const a of forward) {
      pipeline.onMotion({ t, acceleration: vec(0, a, 0), accelerationIncludingGravity: null });
      t += STEP;
    }
  };
  return { pipeline, strikes, feed };
}

describe("MotionPipeline", () => {
  it("reports zero angles in the calibrated guard", () => {
    const { pipeline } = flatPhone();
    expect(pipeline.frame.pitch).toBeCloseTo(0);
    expect(pipeline.frame.yaw).toBeCloseTo(0);
  });

  it("tips the blade up when the phone tilts up", () => {
    const { pipeline } = flatPhone();
    pipeline.onOrientation(quatFromDeviceEuler(0, 30, 0));
    expect(pipeline.frame.pitch).toBeCloseTo(Math.PI / 6, 5);
  });

  it("swings the blade sideways when the heading turns", () => {
    const { pipeline } = flatPhone();
    pipeline.onOrientation(quatFromDeviceEuler(20, 0, 0));
    expect(Math.abs(pipeline.frame.yaw)).toBeCloseTo((20 * Math.PI) / 180, 5);
  });

  it("turns a thrust along the strip into a jab and a pull back into a parry", () => {
    const { strikes, feed } = flatPhone();
    feed([0, 0, 10, 26, 30, 12, -18, -24, -10, 0]);
    feed(new Array(40).fill(0));
    feed([0, -10, -22, -26, -8, 0]);
    expect(strikes).toEqual(["jab", "parry"]);
  });

  it("does not turn a jab into footwork", () => {
    const { pipeline, feed } = flatPhone();
    feed(new Array(20).fill(0));
    feed([0, 12, 28, 30, 10, -20, -28, -14, 0]);
    feed(new Array(40).fill(0));
    expect(pipeline.frame.move).toBe(0);
  });

  it("falls back to removing gravity itself when only raw acceleration is given", () => {
    const strikes: StrikeAction[] = [];
    const pipeline = new MotionPipeline(DEFAULT_TUNING, (action) => strikes.push(action));
    pipeline.onOrientation(quatFromDeviceEuler(0, 0, 0));
    pipeline.calibrate();
    let t = 0;
    for (let i = 0; i < 120; i++, t += STEP) {
      pipeline.onMotion({ t, acceleration: null, accelerationIncludingGravity: vec(0, 0, 9.81) });
    }
    for (const a of [0, 12, 28, 32, 10, 0]) {
      pipeline.onMotion({ t, acceleration: null, accelerationIncludingGravity: vec(0, a, 9.81) });
      t += STEP;
    }
    expect(strikes).toEqual(["jab"]);
  });
});
