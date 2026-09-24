import { describe, expect, it } from "vitest";
import type { FencerFrame } from "@/games/fencing/engine/frames";
import { Animator } from "./animator";
import { solveTwoBone, v2 } from "./geometry";
import { GUARD } from "./guard-pose";
import { BONES, solve } from "./skeleton";

const frame = (overrides: Partial<FencerFrame> = {}): FencerFrame => ({
  slot: 1, characterId: "vale", x: 0, facing: 1, pitch: 0, yaw: 0, roll: 0, speed: 0,
  action: "idle", actionMs: 0, parrying: false, ...overrides,
});

describe("solveTwoBone", () => {
  it("lands the end on a reachable target with both bones at length", () => {
    const root = v2(0, 1);
    const target = v2(0.3, 0.4);
    const { joint, end } = solveTwoBone(root, target, 0.42, 0.42, 1);
    expect(end.x).toBeCloseTo(target.x);
    expect(end.y).toBeCloseTo(target.y);
    expect(Math.hypot(joint.x - root.x, joint.y - root.y)).toBeCloseTo(0.42);
    expect(Math.hypot(end.x - joint.x, end.y - joint.y)).toBeCloseTo(0.42);
  });

  it("straightens toward a target out of reach", () => {
    const { end } = solveTwoBone(v2(0, 0), v2(5, 0), 0.3, 0.3, 1);
    expect(end.x).toBeCloseTo(0.6, 3);
  });
});

describe("skeleton and animator", () => {
  it("bends both knees toward the opponent in guard", () => {
    const joints = solve(GUARD);
    const kneeAhead = (knee: { x: number; y: number }, ankle: { x: number; y: number }) => {
      // Knee sits in front of the straight line from hip to ankle.
      const t = (knee.y - joints.hips.y) / (ankle.y - joints.hips.y);
      return knee.x > joints.hips.x + (ankle.x - joints.hips.x) * t;
    };
    expect(kneeAhead(joints.frontKnee, joints.frontAnkle)).toBe(true);
    expect(kneeAhead(joints.backKnee, joints.backAnkle)).toBe(true);
    expect(joints.head.y).toBeGreaterThan(joints.hips.y + BONES.torso);
  });

  it("follows the live blade in guard and lunges during a jab", () => {
    const animator = new Animator();
    const guard = animator.pose(frame({ pitch: 0.3 }), 0);
    expect(guard.bladeAngle).toBeCloseTo(GUARD.bladeAngle + 0.3);
    const lunging = new Animator();
    lunging.pose(frame({ action: "jab", actionMs: 0 }), 0);
    let pose = guard;
    for (let t = 16; t <= 160; t += 16) pose = lunging.pose(frame({ action: "jab", actionMs: t }), t);
    expect(pose.frontFoot.x).toBeGreaterThan(GUARD.frontFoot.x + 0.4);
    // Long after the jab it springs back to following the phone.
    for (let t = 176; t <= 1200; t += 16) pose = lunging.pose(frame({ action: "jab", actionMs: t }), t);
    expect(pose.frontFoot.x).toBeCloseTo(GUARD.frontFoot.x, 2);
  });
});
