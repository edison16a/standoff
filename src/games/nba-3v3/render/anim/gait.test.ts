import { describe, expect, it } from "vitest";
import { strideLength } from "../../engine/dribble-ball";
import { gait, stanceShare } from "./gait";

const LEG = 0.95;

/** Where the left foot is, ahead of the hip, from the hip and knee alone. */
function footAhead(phase: number, speed: number): number {
  const g = gait({ phase, speed, stride: strideLength(speed, LEG, false), leg: LEG, heading: 0 });
  const hip = (g.pose.legLLift ?? 0) - 0.04;
  const knee = g.pose.kneeL ?? 0;
  const thigh = LEG * 0.514;
  const shin = LEG * 0.486;
  return thigh * Math.sin(hip) + shin * Math.sin(hip - knee);
}

describe("gait", () => {
  it("keeps the planted foot still on the floor at walking, jogging and sprinting pace", () => {
    for (const speed of [1.3, 3.5, 6.5]) {
      const stride = strideLength(speed, LEG, false);
      const share = stanceShare(Math.min(1, Math.max(0, (speed - 1.7) / 1.7)));
      // Across the middle of the stance the foot must slide back under the body as fast as the body moves on.
      const a = 0.25 * share;
      const b = 0.75 * share;
      const travelled = footAhead(a, speed) - footAhead(b, speed);
      const expected = (b - a) * stride;
      expect(travelled / expected).toBeGreaterThan(0.75);
      expect(travelled / expected).toBeLessThan(1.25);
    }
  });

  it("folds the knee far more in a sprint than in a walk, and leaves the floor only running", () => {
    const peak = (speed: number) => {
      let knee = 0;
      let air = 0;
      for (let i = 0; i < 100; i++) {
        const g = gait({ phase: i / 100, speed, stride: strideLength(speed, LEG, false), leg: LEG, heading: 0 });
        knee = Math.max(knee, g.pose.kneeL ?? 0);
        air = Math.max(air, g.air);
      }
      return { knee, air };
    };
    const walk = peak(1.3);
    const sprint = peak(7);
    expect(sprint.knee).toBeGreaterThan(walk.knee + 0.8);
    expect(walk.air).toBe(0);
    expect(sprint.air).toBeGreaterThan(0.5);
  });

  it("swings each arm against the leg on its own side", () => {
    const g = gait({ phase: 0.05, speed: 5, stride: strideLength(5, LEG, false), leg: LEG, heading: 0 });
    // The left leg reaches forward at its strike, so the left arm is back and the right forward.
    expect(g.pose.legLLift!).toBeGreaterThan(g.pose.legRLift!);
    expect(g.pose.armRRaise!).toBeGreaterThan(g.pose.armLRaise!);
  });

  it("steps the legs out to the side when moving sideways, without crossing them far", () => {
    for (let i = 0; i < 20; i++) {
      const g = gait({ phase: i / 20, speed: 3, stride: strideLength(3, LEG, false), leg: LEG, heading: Math.PI / 2 });
      expect(g.pose.legLSpread!).toBeGreaterThan(-0.02);
      expect(g.pose.legRSpread!).toBeGreaterThan(-0.02);
      expect(Math.abs(g.pose.legLLift! - 0.04)).toBeLessThan(1e-9);
    }
  });
});
