import { describe, expect, it } from "vitest";
import type { FencerFrame } from "@/games/fencing/engine/frames";
import { Animator } from "./animator";
import { GUARD } from "./guard-pose";

const frame = (overrides: Partial<FencerFrame> = {}): FencerFrame => ({
  slot: 1, characterId: "vale", x: 0, facing: 1, pitch: 0, yaw: 0, roll: 0, speed: 0,
  action: "idle", actionMs: 0, parrying: false, ...overrides,
});

describe("animator", () => {
  it("follows the live blade in guard", () => {
    const pose = new Animator().pose(frame({ pitch: 0.3, yaw: 0.2 }), 0);
    expect(pose.bladeAngle).toBeCloseTo(GUARD.bladeAngle + 0.3);
    expect(pose.bladeYaw).toBeCloseTo(0.2);
  });

  it("lunges during a jab and springs back to the phone after", () => {
    const lunging = new Animator();
    lunging.pose(frame({ action: "jab", actionMs: 0 }), 0);
    let pose = GUARD;
    for (let t = 16; t <= 220; t += 16) pose = lunging.pose(frame({ action: "jab", actionMs: t }), t);
    // Fully out by the time the tip arrives.
    expect(pose.frontFoot.x).toBeGreaterThan(GUARD.frontFoot.x + 0.55);
    expect(pose.hips.y).toBeLessThan(GUARD.hips.y - 0.12);
    for (let t = 236; t <= 1400; t += 16) pose = lunging.pose(frame({ action: "jab", actionMs: t }), t);
    expect(pose.frontFoot.x).toBeCloseTo(GUARD.frontFoot.x, 2);
  });

  it("holds a lunge that scored out through the call", () => {
    const animator = new Animator();
    let pose = GUARD;
    for (let t = 0; t <= 300; t += 16) pose = animator.pose(frame({ action: "jab", actionMs: t }), t);
    for (let t = 316; t <= 900; t += 16) pose = animator.pose(frame({ action: "scored", actionMs: t }), t);
    expect(pose.frontFoot.x).toBeGreaterThan(GUARD.frontFoot.x + 0.55);
  });

  it("snaps the blade up for a parry while the window is open", () => {
    const animator = new Animator();
    let pose = GUARD;
    for (let t = 0; t <= 200; t += 16) pose = animator.pose(frame({ action: "parry", actionMs: t, parrying: true }), t);
    expect(pose.bladeAngle).toBeGreaterThan(0.9);
  });
});
