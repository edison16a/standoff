import { describe, expect, it } from "vitest";
import type { StrikeAction } from "@/games/fencing/protocol";
import { DEFAULT_TUNING } from "@/games/fencing/tuning";
import { quatFromDeviceEuler, vec, type Vec3 } from "@/games/kit/motion/math3d";
import { MotionPipeline, TAP_QUIET_MS } from "./motion-pipeline";
import { SAMPLE_MS } from "./traces";

const STEP = 1000 / 60;

/**
 * A phone lying flat, top edge pointing north. In that pose device z is
 * earth up, so a push down is negative device z.
 */
function flatPhone() {
  const strikes: StrikeAction[] = [];
  const pipeline = new MotionPipeline(DEFAULT_TUNING, (action) => strikes.push(action));
  pipeline.onOrientation(quatFromDeviceEuler(0, 0, 0));
  pipeline.calibrate();
  let t = 0;
  const feed = (readings: Vec3[], rotationRate?: Vec3) => {
    for (const a of readings) {
      pipeline.onMotion({ t, acceleration: a, accelerationIncludingGravity: null, rotationRate });
      t += STEP;
    }
  };
  return { pipeline, strikes, feed };
}

const still = (n: number) => new Array<Vec3>(n).fill(vec(0, 0, 0));
const down = (list: number[]) => list.map((a) => vec(0, 0, -a));

/**
 * Turns the phone smoothly over `ms` from `start`, one orientation and one
 * still motion reading per frame. `pose(k)` gives alpha and beta in degrees.
 */
function turn(pipeline: MotionPipeline, feed: (readings: Vec3[]) => void, start: number, ms: number, pose: (k: number) => [number, number]) {
  for (let t = 0; t <= ms; t += STEP) {
    const k = (1 - Math.cos((Math.PI * t) / ms)) / 2;
    const [alpha, beta] = pose(k);
    pipeline.onOrientation(quatFromDeviceEuler(alpha, beta, 0), start + t);
    feed(still(1));
  }
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

  it("reads a quick move in any direction as a jab", () => {
    for (const axis of [vec(1, 0, 0), vec(0, 1, 0), vec(0, 0, -1)]) {
      const { strikes, feed } = flatPhone();
      feed([0, 0, 10, 26, 30, 12, 0].map((a) => vec(axis.x * a, axis.y * a, axis.z * a)));
      feed(still(20));
      expect(strikes).toEqual(["jab"]);
    }
  });

  it("reads a sharp turn from the gyroscope as a jab, whichever way it is signed", () => {
    for (const sign of [1, -1]) {
      const { strikes, feed } = flatPhone();
      feed(still(6), vec(0, 0, 0));
      feed(still(6), vec(0, sign * 500, 0));
      feed(still(20), vec(0, 0, 0));
      expect(strikes).toEqual(["jab"]);
    }
  });

  it("reads a sharp turn from the orientation on a phone with no gyroscope", () => {
    const { pipeline, strikes, feed } = flatPhone();
    turn(pipeline, feed, 0, 150, (k) => [-40 * k, -30 * k]);
    feed(still(20));
    expect(strikes).toEqual(["jab"]);
  });

  it("reads a steady raise up and to the right as a parry", () => {
    const { pipeline, strikes, feed } = flatPhone();
    turn(pipeline, feed, 0, 700, (k) => [-32 * k, 45 * k]);
    expect(strikes).toEqual(["parry"]);
  });

  it("does nothing on a steady raise up and to the left", () => {
    const { pipeline, strikes, feed } = flatPhone();
    turn(pipeline, feed, 0, 700, (k) => [32 * k, 45 * k]);
    expect(strikes).toEqual([]);
  });

  it("measures up and right from the calibrated guard, not from level", () => {
    const strikes: StrikeAction[] = [];
    const pipeline = new MotionPipeline(DEFAULT_TUNING, (action) => strikes.push(action));
    // A guard turned 60 degrees to the right and tipped 20 degrees up.
    pipeline.onOrientation(quatFromDeviceEuler(-60, 20, 0), 0);
    pipeline.calibrate();
    expect(pipeline.sword.pitch).toBeCloseTo(0);
    let t = 0;
    const feed = (readings: Vec3[]) => readings.forEach((a) => pipeline.onMotion({ t: (t += STEP), acceleration: a, accelerationIncludingGravity: null }));
    // Where a level guard facing ahead would parry, this one points up and left: nothing.
    turn(pipeline, feed, 0, 700, (k) => [-60 + 28 * k, 20 + 25 * k]);
    expect(strikes).toEqual([]);
    // Back to the guard, then up and right of it.
    turn(pipeline, feed, 800, 700, (k) => [-32 - 28 * k, 45 - 25 * k]);
    turn(pipeline, feed, 1600, 700, (k) => [-60 - 32 * k, 20 + 45 * k]);
    expect(strikes).toEqual(["parry"]);
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
    for (const a of [0, 12, 28, 32, 10, 0, 0, 0, 0, 0, 0]) {
      pipeline.onMotion({ t, acceleration: null, accelerationIncludingGravity: vec(0, 0, 9.81 - a) });
      t += STEP;
    }
    expect(strikes).toEqual(["jab"]);
  });

  it("waits after a tap on the screen before it reads a strike", () => {
    const { pipeline, strikes, feed } = flatPhone();
    pipeline.noteTap(0);
    feed(down([0, 0, 10, 26, 30, 12, 0]));
    expect(strikes).toEqual([]);
    // The move itself has to calm down too before a new one can start.
    feed(still(Math.ceil(TAP_QUIET_MS / SAMPLE_MS) + 10));
    feed(down([0, 0, 10, 26, 30, 12, 0]));
    feed(still(10));
    expect(strikes).toEqual(["jab"]);
  });
});
