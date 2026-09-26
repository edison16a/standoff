import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/games/blade-clash/characters";
import { dot, length, sub } from "@/games/kit/motion/math3d";
import { distance } from "./geometry";
import { blendControl, clampControl, GUARD, PITCH_MAX, swordPose, YAW_LIMIT, type SwordControl } from "./sword";

const blade = CHARACTERS.knight.blade;
const hold = (yaw: number, pitch: number, reach = 0, roll = 0): SwordControl => ({ yaw, pitch, roll, reach });

describe("swordPose", () => {
  it("keeps the hand within an arm's length of the shoulder for every hold", () => {
    for (const facing of [1, -1] as const) {
      const shoulder = { x: 0, y: 1.45, z: 0.18 * facing };
      for (let yaw = -YAW_LIMIT; yaw <= YAW_LIMIT; yaw += 0.25) {
        for (let pitch = -1.3; pitch <= PITCH_MAX; pitch += 0.25) {
          for (const reach of [0, 0.5, 1]) {
            expect(distance(swordPose(0, facing, hold(yaw, pitch, reach), blade).hand, shoulder)).toBeLessThan(0.8);
          }
        }
      }
    }
  });

  it("puts the tip a blade's length from the hand, along the blade", () => {
    const pose = swordPose(0.4, 1, hold(0.3, 0.2, 0.5), blade);
    expect(distance(pose.hand, pose.tip)).toBeCloseTo(blade.length);
    expect(length(pose.dir)).toBeCloseTo(1);
    expect(dot(sub(pose.tip, pose.hand), pose.dir)).toBeCloseTo(blade.length);
  });

  it("points the blade at the opponent for both fighters", () => {
    expect(swordPose(-2, 1, hold(0, 0), blade).dir.x).toBeCloseTo(1);
    expect(swordPose(2, -1, hold(0, 0), blade).dir.x).toBeCloseTo(-1);
  });

  it("swings to each fighter's own right, and mirrors between them", () => {
    const one = swordPose(0, 1, hold(0.8, 0), blade);
    const two = swordPose(0, -1, hold(0.8, 0), blade);
    expect(one.dir.z).toBeGreaterThan(0.5);
    expect(two.dir.z).toBeCloseTo(-one.dir.z);
    expect(two.tip.x).toBeCloseTo(-one.tip.x);
  });

  it("raises the hand and the tip with the blade, and drops them for a low guard", () => {
    const high = swordPose(0, 1, hold(0, 1.3), blade);
    const mid = swordPose(0, 1, hold(0, 0.3), blade);
    const low = swordPose(0, 1, hold(0, -1), blade);
    expect(high.hand.y).toBeGreaterThan(mid.hand.y);
    expect(mid.hand.y).toBeGreaterThan(low.hand.y);
    expect(high.tip.y).toBeGreaterThan(2.4);
    expect(low.tip.y).toBeLessThan(0.5);
  });

  it("stretches the arm toward the opponent with reach, for a thrust", () => {
    const bent = swordPose(0, 1, hold(0, 0, 0), blade);
    const out = swordPose(0, 1, hold(0, 0, 1), blade);
    expect(out.hand.x - bent.hand.x).toBeCloseTo(0.35);
    expect(out.tip.x).toBeGreaterThan(1.7);
  });

  it("turns the edge with the roll, always square to the blade", () => {
    const flat = swordPose(0, 1, hold(0.2, 0.4, 0, 0), blade);
    const turned = swordPose(0, 1, hold(0.2, 0.4, 0, Math.PI / 2), blade);
    expect(dot(flat.edge, flat.dir)).toBeCloseTo(0);
    expect(dot(turned.edge, turned.dir)).toBeCloseTo(0);
    expect(dot(flat.edge, turned.edge)).toBeCloseTo(0);
  });
});

describe("controls", () => {
  it("clamps a hold to what an arm can do", () => {
    expect(clampControl(hold(9, 9, 3, 0))).toEqual({ yaw: YAW_LIMIT, pitch: PITCH_MAX, roll: 0, reach: 1 });
  });

  it("blends the roll the short way round", () => {
    const blended = blendControl(hold(0, 0, 0, 3), hold(0, 0, 0, -3), 0.5);
    expect(Math.abs(blended.roll)).toBeCloseTo(Math.PI);
    expect(blendControl(GUARD, hold(1, 1, 1), 1)).toMatchObject({ yaw: 1, pitch: 1, reach: 1 });
  });
});
