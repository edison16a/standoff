import { describe, expect, it } from "vitest";
import { emptyPose } from "../rig/pose";
import { Finale } from "./finales";

describe("the endings", () => {
  it("knocks the loser flat on their back and drops the sword to the floor", () => {
    const finale = new Finale();
    const pose = emptyPose();
    // The fall is played frame by frame, as the animator does, since the sword leaves the hand on the way down.
    for (let ms = 0; ms <= 2000; ms += 16) {
      const frame = emptyPose();
      finale.defeat(frame, ms);
      Object.assign(pose, frame);
    }
    expect(pose.holding).toBe(false);
    expect(pose.hips.y).toBeLessThan(0.25);
    expect(pose.lean).toBeLessThan(-1.3);
    expect(pose.grip.y).toBeCloseTo(0.03, 2);
    // Lying flat: the blade level with the floor.
    expect(Math.abs(pose.blade.y)).toBeLessThan(0.05);
  });

  it("keeps the sword in hand for the first moment of the fall", () => {
    const pose = emptyPose();
    new Finale().defeat(pose, 40);
    expect(pose.holding).toBe(true);
  });

  it("raises the winner's sword overhead, tip to the sky", () => {
    const pose = emptyPose();
    new Finale().victory(pose, 900);
    expect(pose.grip.y).toBeGreaterThan(1.8);
    expect(pose.blade.y).toBeGreaterThan(0.9);
    expect(pose.hand.distanceTo(pose.grip)).toBe(0);
  });
});
