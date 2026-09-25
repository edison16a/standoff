import { describe, expect, it } from "vitest";
import { hit } from "./moves/build";
import { hitstopFrames, hitstunFrames, launchDistance, launchSpeed, launchVector, weightFactor } from "./knockback";
import { STAGES } from "./stages";

const SMASH = hit(15, 9, 0.22, 35);
const JAB = hit(3, 4, 0.04, 20);

describe("the knockback formula", () => {
  it("launches harder the more damage the target carries", () => {
    let last = 0;
    for (const percent of [0, 20, 50, 90, 140, 200]) {
      const speed = launchSpeed(SMASH, percent, 100);
      expect(speed).toBeGreaterThan(last);
      last = speed;
    }
  });

  it("sends heavy fighters less far than light ones", () => {
    expect(weightFactor(100)).toBeCloseTo(1);
    expect(launchSpeed(SMASH, 80, 124)).toBeLessThan(launchSpeed(SMASH, 80, 100));
    expect(launchSpeed(SMASH, 80, 82)).toBeGreaterThan(launchSpeed(SMASH, 80, 100));
  });

  it("keeps a jab at 0 percent short, and makes a heavy hit KO from mid stage past 100 percent", () => {
    expect(launchDistance(launchSpeed(JAB, 3, 100))).toBeLessThan(2);
    const stage = STAGES["dojo-rooftop"];
    const fromMiddle = stage.blast.right - 3;
    const speed = launchSpeed(SMASH, 120, 100);
    const across = launchDistance(speed) * Math.cos((SMASH.angle * Math.PI) / 180);
    expect(across).toBeGreaterThan(fromMiddle);
    // The same hit at low percent keeps the fighter on the stage.
    expect(launchDistance(launchSpeed(SMASH, 15, 100))).toBeLessThan(5);
  });

  it("points the launch by the angle and the side hit from", () => {
    const right = launchVector(10, 0, 1);
    expect(right.x).toBeCloseTo(10);
    expect(right.y).toBeCloseTo(0);
    const up = launchVector(10, 90, -1);
    expect(up.y).toBeCloseTo(10);
    expect(Math.abs(up.x)).toBeLessThan(1e-9);
    const spike = launchVector(10, -80, -1);
    expect(spike.y).toBeLessThan(-9);
    expect(spike.x).toBeLessThan(0);
  });

  it("stuns longer after a harder launch and freezes heavy hits longer", () => {
    expect(hitstunFrames(30)).toBeGreaterThan(hitstunFrames(10));
    expect(hitstopFrames(15, true)).toBeGreaterThan(hitstopFrames(15, false));
    expect(hitstopFrames(15, false)).toBeGreaterThan(hitstopFrames(3, false));
    expect(hitstopFrames(99, true)).toBeLessThanOrEqual(22);
  });
});
