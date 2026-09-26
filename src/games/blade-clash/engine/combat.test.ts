import { describe, expect, it } from "vitest";
import { DEG } from "@/games/kit/motion/math3d";
import { clashPushes } from "./combat";

describe("clashPushes", () => {
  it("bounces a swing back the way it came and shoves a still block along with it", () => {
    // Player one cuts to their left; player two holds still.
    const pushes = clashPushes({ 1: { yaw: -12, pitch: 0 }, 2: { yaw: 0, pitch: 0 } }, 1, 40);
    expect(pushes[1].yaw).toBeGreaterThan(0);
    // Facing each other, one's left is the other's right, so the block goes to its right.
    expect(pushes[2].yaw).toBeGreaterThan(0);
  });

  it("throws harder for a stronger clash, by the knockback angle", () => {
    const soft = clashPushes({ 1: { yaw: 0, pitch: -5 }, 2: { yaw: 0, pitch: 0 } }, 0, 40);
    const hard = clashPushes({ 1: { yaw: 0, pitch: -5 }, 2: { yaw: 0, pitch: 0 } }, 1, 40);
    const size = (turn: { yaw: number; pitch: number }) => Math.hypot(turn.yaw, turn.pitch);
    expect(size(soft[1])).toBeCloseTo(40 * DEG * 0.6);
    expect(size(hard[1])).toBeCloseTo(40 * DEG * 1.2);
    expect(hard[1].pitch).toBeGreaterThan(0);
  });

  it("lifts both blades when neither was turning", () => {
    const pushes = clashPushes({ 1: { yaw: 0, pitch: 0 }, 2: { yaw: 0, pitch: 0 } }, 0.5, 30);
    expect(pushes[1].pitch).toBeGreaterThan(0);
    expect(pushes[2].pitch).toBeGreaterThan(0);
  });
});
