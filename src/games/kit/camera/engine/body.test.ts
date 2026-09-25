import { describe, expect, it } from "vitest";
import { deriveBody } from "./body";
import { LM, mirrorPose, type Pose } from "./landmarks";
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
  it("measures size in frame heights from the shoulders, and scales with the player", () => {
    const near = body({ height: 0.8 });
    const far = body({ height: 0.4 });
    expect(near.shoulderWidth).toBeCloseTo(2 * far.shoulderWidth, 2);
    expect(near.scale).toBeCloseTo(2 * far.scale, 2);
    expect(near.confidence).toBeGreaterThan(0.9);
    // The unit is about one torso length, which a body with its hips in view shows.
    const whole = body({ height: 0.8, legs: true });
    expect(whole.hipsSeen).toBe(true);
    expect(whole.scale / whole.torsoLength).toBeCloseTo(1, 1);
  });

  it("reads a waist up player from the head and shoulders alone", () => {
    const b = body();
    expect(b.hipsSeen).toBe(false);
    expect(b.headSeen).toBe(true);
    expect(b.confidence).toBeGreaterThan(0.9);
    expect(b.head.y).toBeLessThan(b.shoulders.y);
    expect(b.shoulders.y).toBeLessThan(b.hips.y);
    expect(b.torso.y).toBeCloseTo((b.shoulders.y + b.hips.y) / 2, 6);
    expect(b.hips.x).toBeCloseTo(0.5, 3);
  });

  it("guesses the hips under the shoulders, following a lean", () => {
    for (const lean of [0, -0.8, 0.8]) {
      const guessed = body({ lean, height: 0.8 }).hips;
      const seen = body({ lean, height: 0.8, legs: true }).hips;
      expect(guessed.x).toBeCloseTo(seen.x, 2);
      expect(Math.abs(guessed.y - seen.y)).toBeLessThan(0.02);
    }
  });

  it("ignores leg points entirely, even nonsense ones", () => {
    const pose = syntheticPose({}, ASPECT);
    const scrambled: Pose = {
      landmarks: pose.landmarks.map((p, i) => (i >= LM.leftHip ? { x: 0.9, y: 0.05, z: 3, visibility: 0 } : p)),
      world: pose.world.map((p, i) => (i >= LM.leftHip ? { x: 5, y: -5, z: 5, visibility: 0 } : p)),
    };
    const clean = deriveBody(pose, 0, ASPECT, null);
    const odd = deriveBody(scrambled, 0, ASPECT, null);
    expect(odd.hips).toEqual(clean.hips);
    expect(odd.scale).toBe(clean.scale);
    expect(odd.head).toEqual(clean.head);
  });

  it("keeps the shoulder width when the player turns, since only distance should change it", () => {
    const facing = syntheticPose({}, ASPECT);
    const turned = turn(facing, Math.PI / 4);
    expect(deriveBody(turned, 0, ASPECT, null).shoulderWidth).toBeCloseTo(deriveBody(facing, 0, ASPECT, null).shoulderWidth, 3);
  });

  it("guesses the head from the model when the face leaves the top of the picture", () => {
    const b = body({ head: 0.02, lift: 0.1 });
    expect(b.headSeen).toBe(false);
    expect(b.head.y).toBeLessThan(0);
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
    // Close up, hands hanging at the sides are below the picture. A guard is in it.
    expect(down.visible).toBe(false);
    expect(guard.visible).toBe(true);
    expect(body({ height: 0.8 }).arms.left.visible).toBe(true);
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

/** Turns the shoulders about the up axis by `angle`, as a player standing side on. */
function turn(pose: Pose, angle: number): Pose {
  const out: Pose = { landmarks: pose.landmarks.map((p) => ({ ...p })), world: pose.world.map((p) => ({ ...p })) };
  const [l, r] = [LM.leftShoulder, LM.rightShoulder];
  const middle = (out.landmarks[l]!.x + out.landmarks[r]!.x) / 2;
  for (const i of [l, r]) {
    out.landmarks[i]!.x = middle + (out.landmarks[i]!.x - middle) * Math.cos(angle);
    const w = out.world[i]!;
    out.world[i] = { ...w, x: w.x * Math.cos(angle), z: w.z + w.x * Math.sin(angle) };
  }
  return out;
}
