import { describe, expect, it } from "vitest";
import { PoseBlend } from "./pose-blend";
import { makeRig, type BodyDims } from "./rig";

const DIMS: BodyDims = {
  thigh: 0.45, shin: 0.42, foot: 0.08, torso: 0.55, torsoW: 0.36, torsoD: 0.22, shoulderW: 0.4, hipW: 0.24,
  upperArm: 0.3, forearm: 0.27, hand: 0.1, neck: 0.1, head: 0.24, arm: 0.09, leg: 0.12,
};

/** Draws one frame the way the zombie layer does: blend, pose from scratch, blend. */
function frame(blend: PoseBlend, rig: ReturnType<typeof makeRig>, state: "walk" | "attack", arm: number, dt: number) {
  blend.before(rig, state);
  rig.bones.shoulderL.rotation.set(arm, 0, 0);
  blend.after(rig, dt);
  return rig.bones.shoulderL.rotation.x;
}

describe("PoseBlend", () => {
  it("leaves the first pose alone", () => {
    const rig = makeRig(DIMS);
    expect(frame(new PoseBlend(), rig, "walk", -1.4, 1 / 30)).toBeCloseTo(-1.4);
  });

  it("eases a change of state instead of jumping to the new pose", () => {
    const rig = makeRig(DIMS);
    const blend = new PoseBlend();
    frame(blend, rig, "walk", -1.4, 1 / 30);
    const first = frame(blend, rig, "attack", -2.7, 1 / 30);
    // One frame in, the arm has barely left the walk.
    expect(first).toBeGreaterThan(-1.6);
    let last = first;
    for (let i = 0; i < 5; i++) {
      const next = frame(blend, rig, "attack", -2.7, 1 / 30);
      expect(next).toBeLessThanOrEqual(last + 1e-9);
      last = next;
    }
    // By the end of the blend the new pose stands alone.
    expect(frame(blend, rig, "attack", -2.7, 1 / 30)).toBeCloseTo(-2.7);
  });
});
