import { describe, expect, it } from "vitest";
import { STYLES } from "../../../render/anim/styles";
import { championPose, liftFrames, UP_AT, type Hold } from "./champion-pose";

const BOTH: Hold = { hands: "both" };
const LEFT: Hold = { hands: "left", weapon: { armRRaise: 0.3, elbowR: 0.3, wristR: -1.2 } };

describe("championPose", () => {
  it("starts with the cup at the chest and ends with it overhead", () => {
    const frames = liftFrames(BOTH);
    const start = championPose(0, STYLES.karate.stance, frames, BOTH);
    const up = championPose(UP_AT + 0.01, STYLES.karate.stance, frames, BOTH);
    expect(start.armLRaise).toBeCloseTo(1.1);
    expect(up.armLRaise).toBeCloseTo(2.95);
    expect(up.armRRaise).toBeCloseTo(2.95);
  });

  it("dips at the knees before the press", () => {
    const frames = liftFrames(BOTH);
    const dip = championPose(1.2, STYLES.bear.stance, frames, BOTH);
    expect(dip.kneeL).toBeCloseTo(0.6);
    expect(dip.hipY).toBeLessThan(0);
  });

  it("keeps the weapon arm low through a one handed lift", () => {
    const frames = liftFrames(LEFT);
    for (const t of [0, 1, 1.4, UP_AT, 5]) {
      const pose = championPose(t, STYLES.samurai.stance, frames, LEFT);
      expect(pose.armRRaise).toBeCloseTo(0.3);
      expect(pose.wristR).toBeCloseTo(-1.2);
    }
    expect(championPose(5, STYLES.samurai.stance, frames, LEFT).armLRaise).toBeGreaterThan(2.9);
  });

  it("pumps the cup and turns once it is up", () => {
    const frames = liftFrames(BOTH);
    const poses = [0, 0.5, 1, 1.5, 2].map((s) => championPose(UP_AT + s, STYLES.karate.stance, frames, BOTH));
    expect(Math.max(...poses.map((p) => p.elbowL))).toBeGreaterThan(0.6);
    expect(poses.some((p) => Math.abs(p.spin) > 0.1)).toBe(true);
  });
});
