import { describe, expect, it } from "vitest";
import { GUARD } from "@/games/blade-clash/engine/sword";
import { quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import { MotionPipeline } from "./motion-pipeline";
import { buildCalibration, EDGE_YAW } from "./sword-aim";

const flat = (right: number, up: number) => quatFromDeviceEuler(-right, up, 0);

describe("MotionPipeline", () => {
  it("holds the guard until it has a reading and a calibration", () => {
    const pipeline = new MotionPipeline();
    expect(pipeline.control).toEqual(GUARD);
    pipeline.onOrientation(flat(0, 0));
    expect(pipeline.control).toEqual(GUARD);
    expect(pipeline.aim).toBeNull();
  });

  it("follows the phone once calibrated", () => {
    const pipeline = new MotionPipeline();
    pipeline.setCalibration(
      buildCalibration(flat(0, 0), { "top-left": flat(-16, 10), "bottom-right": flat(16, -10) }, flat(5, -10)),
    );
    pipeline.onOrientation(flat(0, 0));
    expect(pipeline.control.reach).toBe(1);
    pipeline.onOrientation(flat(20, 0));
    expect(pipeline.aim!.x).toBeCloseTo(1, 2);
    expect(pipeline.control.yaw).toBeCloseTo(EDGE_YAW, 2);
    pipeline.onOrientation(flat(5, -10));
    expect(pipeline.control.reach).toBe(0);
  });

  it("takes a dragged point over the sensors, and lets go of it", () => {
    const pipeline = new MotionPipeline();
    pipeline.drag({ x: -1, y: 0 });
    expect(pipeline.control.yaw).toBeCloseTo(-EDGE_YAW);
    expect(pipeline.aim).toEqual({ x: -1, y: 0 });
    pipeline.drag(null);
    expect(pipeline.control).toEqual(GUARD);
  });
});
