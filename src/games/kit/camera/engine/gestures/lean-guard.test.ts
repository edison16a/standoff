import { describe, expect, it } from "vitest";
import { bodiesFrom } from "../sequence";
import type { PoseSpec } from "../synthetic";
import type { PoseKey } from "../timeline";
import { GuardDetector } from "./guard";
import { LeanDetector } from "./lean";
import { hysteresis } from "./reading";

const hold = (pose: PoseSpec): PoseKey[] => [{ at: 0, pose }];
const into = (from: PoseSpec, to: PoseSpec, ms = 250): PoseKey[] => [{ at: 0, pose: from }, { at: ms, pose: to }, { at: ms + 300, pose: to }];

function leans(keys: PoseKey[]) {
  const lean = new LeanDetector();
  return bodiesFrom(keys).map((body) => lean.update(body, body.scale));
}

function guards(keys: PoseKey[], tail = 300) {
  const guard = new GuardDetector();
  return bodiesFrom(keys, { tail }).map((body) => guard.update(body, body.scale));
}

describe("leaning", () => {
  it("reads a lean to either side, and upright again", () => {
    const keys: PoseKey[] = [
      { at: 0, pose: {} },
      { at: 200, pose: { lean: -0.8 } },
      { at: 500, pose: { lean: -0.8 } },
      { at: 700, pose: {} },
      { at: 900, pose: { lean: 0.8 } },
      { at: 1200, pose: { lean: 0.8 } },
    ];
    const sides = leans(keys).filter((r) => r.changed).map((r) => r.side);
    expect(sides).toEqual([-1, 0, 1]);
  });

  it("never reads a sideways step as a lean", () => {
    expect(leans(into({ x: 0.4 }, { x: 0.65 })).some((r) => r.active)).toBe(false);
  });

  it("ignores a small sway", () => {
    expect(leans(into({}, { lean: 0.25 })).some((r) => r.active)).toBe(false);
  });

  it("measures against the player's own upright head", () => {
    const lean = new LeanDetector();
    const body = bodiesFrom(hold({ lean: 0.6 }), { tail: 0 })[0]!;
    const rest = ((body.head.x - body.hips.x) * body.aspect) / body.scale;
    expect(lean.update(body, body.scale).side).toBe(1);
    expect(new LeanDetector().update(body, body.scale, rest).side).toBe(0);
  });

  it("works near and far", () => {
    expect(leans(into({ height: 0.9 }, { height: 0.9, lean: 0.8 })).some((r) => r.side === 1)).toBe(true);
    expect(leans(into({ height: 0.3 }, { height: 0.3, lean: -0.8 })).some((r) => r.side === -1)).toBe(true);
  });
});

describe("the guard", () => {
  const guardUp: PoseSpec = { left: { guard: 1 }, right: { guard: 1 } };

  it("is up when both fists are by the face and in front of it", () => {
    const readings = guards(into({}, guardUp));
    expect(readings[0]!.active).toBe(false);
    expect(readings[readings.length - 1]!.active).toBe(true);
    expect(readings.filter((r) => r.changed)).toHaveLength(1);
    expect(readings[readings.length - 1]!.confidence).toBeGreaterThan(0.8);
  });

  it("drops when one hand drops", () => {
    const readings = guards(into(guardUp, { left: { guard: 1 } }));
    expect(readings[0]!.active).toBe(true);
    expect(readings[readings.length - 1]!.active).toBe(false);
    expect(readings[readings.length - 1]!.hands.left).toBeGreaterThan(0.8);
    expect(readings[readings.length - 1]!.hands.right).toBeLessThan(0.2);
  });

  it("is not up with arms overhead, hanging, or thrown out in a punch", () => {
    expect(guards(hold({ left: { raise: 1 }, right: { raise: 1 } }))[0]!.active).toBe(false);
    expect(guards(hold({}))[0]!.active).toBe(false);
    expect(guards(hold({ left: { guard: 1, punch: 1 }, right: { guard: 1, punch: 1 } }))[0]!.active).toBe(false);
  });

  it("works for a tall player near the camera and a short one far away", () => {
    expect(guards(hold({ ...guardUp, height: 0.9 }))[0]!.active).toBe(true);
    expect(guards(hold({ ...guardUp, height: 0.3 }))[0]!.active).toBe(true);
  });

  it("holds through a wobble at the edge instead of flickering", () => {
    expect(hysteresis(false, 0.5, 0.6, 0.4)).toBe(false);
    expect(hysteresis(true, 0.5, 0.6, 0.4)).toBe(true);
    expect(hysteresis(true, 0.35, 0.6, 0.4)).toBe(false);
    expect(hysteresis(false, 0.6, 0.6, 0.4)).toBe(true);
  });
});
