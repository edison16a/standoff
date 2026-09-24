import { describe, expect, it } from "vitest";
import { deriveBody } from "./body";
import { LM, mirrorPose } from "./landmarks";
import { syntheticPose, type PoseSpec } from "./synthetic";

const ASPECT = 16 / 9;
const body = (spec: PoseSpec = {}, time = 0) => deriveBody(syntheticPose(spec, ASPECT), time, ASPECT, null);

describe("mirroring the model's output", () => {
  it("flips x only, keeping the person's own left and right", () => {
    const raw = Array.from({ length: 33 }, (_, i) => ({ x: i === LM.leftShoulder ? 0.7 : 0.3, y: 0.4, z: -0.1, visibility: 0.9 }));
    const pose = mirrorPose(raw, raw);
    expect(pose.landmarks[LM.leftShoulder]!.x).toBeCloseTo(0.3, 6);
    expect(pose.landmarks[LM.rightShoulder]!.x).toBeCloseTo(0.7, 6);
    expect(pose.world[LM.leftShoulder]!.x).toBeCloseTo(-0.7, 6);
    expect(pose.landmarks[0]!.y).toBe(0.4);
    expect(pose.landmarks[0]!.z).toBe(-0.1);
  });

  it("puts a player's left shoulder on the left of the picture, as in a mirror", () => {
    const pose = syntheticPose();
    expect(pose.landmarks[LM.leftShoulder]!.x).toBeLessThan(pose.landmarks[LM.rightShoulder]!.x);
  });
});

describe("the body model", () => {
  it("measures size in frame heights and scales with the player", () => {
    const near = body({ height: 0.8 });
    const far = body({ height: 0.4 });
    expect(near.torsoLength).toBeCloseTo(2 * far.torsoLength, 2);
    expect(near.scale / near.torsoLength).toBeCloseTo(1, 1);
    expect(near.shoulderWidth).toBeGreaterThan(0.1);
    expect(near.confidence).toBeGreaterThan(0.9);
  });

  it("finds the head above the shoulders above the hips", () => {
    const b = body();
    expect(b.head.y).toBeLessThan(b.shoulders.y);
    expect(b.shoulders.y).toBeLessThan(b.hips.y);
    expect(b.torso.y).toBeCloseTo((b.shoulders.y + b.hips.y) / 2, 6);
    expect(b.hips.x).toBeCloseTo(0.5, 3);
  });

  it("reads straight, bent and punching arms", () => {
    const down = body().arms.left;
    const guard = body({ left: { guard: 1 } }).arms.left;
    const punch = body({ left: { guard: 1, punch: 1 } }).arms.left;
    expect(down.extension).toBeGreaterThan(0.95);
    expect(guard.extension).toBeLessThan(0.65);
    expect(punch.extension).toBeGreaterThan(0.95);
    expect(punch.forward).toBeGreaterThan(0.45);
    expect(guard.forward).toBeGreaterThan(0.1);
    expect(Math.abs(down.forward)).toBeLessThan(0.1);
    // Arms hang below the shoulders, and a guard sits above them.
    expect(down.offset.y).toBeGreaterThan(0.8);
    expect(guard.offset.y).toBeLessThan(0);
    expect(down.visible).toBe(true);
  });

  it("gives velocities in torso lengths per second", () => {
    const first = body({ x: 0.5 }, 0);
    const pose = syntheticPose({ x: 0.52 }, ASPECT);
    const second = deriveBody(pose, 100, ASPECT, first);
    const expected = ((0.02 * ASPECT) / second.scale / 0.1) * 0.6;
    expect(second.velocity.torso.x).toBeCloseTo(expected, 3);
    expect(second.velocity.torso.y).toBeCloseTo(0, 3);
  });

  it("starts from rest after a long gap", () => {
    const first = body({ x: 0.3 }, 0);
    const later = deriveBody(syntheticPose({ x: 0.6 }, ASPECT), 2000, ASPECT, first);
    expect(later.velocity.torso.x).toBe(0);
  });
});
