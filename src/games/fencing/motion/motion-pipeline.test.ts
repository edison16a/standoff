import { describe, expect, it } from "vitest";
import type { StrikeAction } from "@/games/fencing/protocol";
import { DEFAULT_TUNING } from "@/games/fencing/tuning";
import { quatFromDeviceEuler, vec } from "@/games/kit/motion/math3d";
import { MotionPipeline } from "./motion-pipeline";

const STEP = 1000 / 60;

/**
 * A phone lying flat, top edge pointing north. In that pose device z is
 * earth up, so a chop down is negative device z.
 */
function flatPhone() {
  const strikes: StrikeAction[] = [];
  const pipeline = new MotionPipeline(DEFAULT_TUNING, (action) => strikes.push(action));
  pipeline.onOrientation(quatFromDeviceEuler(0, 0, 0));
  pipeline.calibrate();
  let t = 0;
  const feed = (down: number[]) => {
    for (const a of down) {
      pipeline.onMotion({ t, acceleration: vec(0, 0, -a), accelerationIncludingGravity: null });
      t += STEP;
    }
  };
  return { pipeline, strikes, feed };
}

describe("MotionPipeline", () => {
  it("reports zero angles in the calibrated guard", () => {
    const { pipeline } = flatPhone();
    expect(pipeline.sword.pitch).toBeCloseTo(0);
    expect(pipeline.sword.yaw).toBeCloseTo(0);
  });

  it("tips the blade up when the phone tilts up", () => {
    const { pipeline } = flatPhone();
    pipeline.onOrientation(quatFromDeviceEuler(0, 30, 0));
    expect(pipeline.sword.pitch).toBeCloseTo(Math.PI / 6, 5);
  });

  it("swings the blade sideways when the heading turns", () => {
    const { pipeline } = flatPhone();
    pipeline.onOrientation(quatFromDeviceEuler(20, 0, 0));
    expect(Math.abs(pipeline.sword.yaw)).toBeCloseTo((20 * Math.PI) / 180, 5);
  });

  it("turns a chop down into a jab and a lift up into a parry", () => {
    const { strikes, feed } = flatPhone();
    feed([0, 0, 10, 26, 30, 12, -18, -24, -10, 0]);
    feed(new Array(40).fill(0));
    feed([0, -10, -22, -26, -8, 0]);
    expect(strikes).toEqual(["jab", "parry"]);
  });

  it("reads the level of a phone lying flat, and its tilt", () => {
    const { pipeline } = flatPhone();
    expect(pipeline.level!.pitch).toBeCloseTo(0, 5);
    pipeline.onOrientation(quatFromDeviceEuler(0, 20, 0));
    expect(pipeline.level!.pitch).toBeCloseTo((20 * Math.PI) / 180, 5);
    expect(pipeline.level!.roll).toBeCloseTo(0, 5);
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
      pipeline.onMotion({ t, acceleration: null, accelerationIncludingGravity: vec(0, 0, 9.81 - a) });
      t += STEP;
    }
    expect(strikes).toEqual(["jab"]);
  });
});
