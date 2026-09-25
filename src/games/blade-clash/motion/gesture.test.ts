import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { CONFIRM_MS, GestureClassifier, gestureSettings, type Sensitivity } from "./gesture";
import { ease, none, pulse, shake, sum, thrust, trace, wander, type Motion } from "./traces";

const settings = gestureSettings(DEFAULT_TUNING);

function classify(motion: Motion, ms = 1500, sensitivity?: Sensitivity) {
  const classifier = new GestureClassifier(settings, sensitivity);
  const fired: { action: string; t: number }[] = [];
  for (const sample of trace(motion, ms)) {
    const action = classifier.update(sample);
    if (action) fired.push({ action, t: sample.t });
  }
  return { actions: fired.map((f) => f.action), fired, classifier };
}

describe("GestureClassifier", () => {
  it("does nothing while the blade wanders slowly, so the sword just follows", () => {
    expect(classify({ pitch: wander(15, 2000), yaw: wander(20, 2600, 1) }, 6000).actions).toEqual([]);
  });

  it("reads a long shake as exactly one jab", () => {
    expect(classify({ accel: shake(100, 900, 26), spin: shake(100, 900, 9) }).actions).toEqual(["jab"]);
  });

  it("reads a quick jab by acceleration alone", () => {
    expect(classify({ accel: thrust(100, 24) }).actions).toEqual(["jab"]);
  });

  it("reads a quick wrist flick by its turn alone, whichever way it turns", () => {
    expect(classify({ spin: pulse(100, 150, 9) }).actions).toEqual(["jab"]);
    const flickLeft = { yaw: ease(100, 120, 0, -35) };
    expect(classify(flickLeft).actions).toEqual(["jab"]);
    const flickDown = { pitch: ease(100, 120, 0, -35) };
    expect(classify(flickDown).actions).toEqual(["jab"]);
  });

  it("fires the jab soon after the move starts", () => {
    const { fired } = classify({ accel: thrust(100, 24) });
    expect(fired[0]!.t).toBeLessThan(100 + 60 + CONFIRM_MS + 20);
  });

  it("reads two shakes with a pause between as two jabs", () => {
    const accel = sum(shake(100, 300, 26), shake(1000, 300, 26));
    expect(classify({ accel }, 1600).actions).toEqual(["jab", "jab"]);
  });

  it("reads a steady raise up and right past the point as a parry", () => {
    const { actions, fired } = classify({ pitch: ease(100, 600, 0, 45), yaw: ease(100, 600, 0, 32) });
    expect(actions).toEqual(["parry"]);
    // It fires the moment the blade passes the point, not at the end of the raise.
    expect(fired[0]!.t).toBeLessThan(700);
  });

  it("reads a fast raise up and right as a parry and not a jab", () => {
    const fast = { pitch: ease(100, 200, 0, 45), yaw: ease(100, 200, 0, 32) };
    expect(classify(fast).actions).toEqual(["parry"]);
    // The same move is quick enough to jab: with the point out of reach it is one.
    const farPoint = gestureSettings({ ...DEFAULT_TUNING, parryRise: 70 });
    const classifier = new GestureClassifier(farPoint);
    expect(trace(fast, 1500).map((s) => classifier.update(s)).filter(Boolean)).toEqual(["jab"]);
  });

  it("reads a fast raise that stops short of the point as a jab", () => {
    expect(classify({ pitch: ease(100, 120, 0, 45), yaw: ease(100, 120, 0, 8) }).actions).toEqual(["jab"]);
  });

  it("ignores a steady raise that is not right enough or not high enough", () => {
    expect(classify({ pitch: ease(100, 600, 0, 50) }).actions).toEqual([]);
    expect(classify({ pitch: ease(100, 600, 0, 50), yaw: ease(100, 600, 0, 12) }).actions).toEqual([]);
    expect(classify({ pitch: ease(100, 600, 0, 20), yaw: ease(100, 600, 0, 35) }).actions).toEqual([]);
  });

  it("ignores the mirror image: a steady raise up and to the left", () => {
    expect(classify({ pitch: ease(100, 600, 0, 45), yaw: ease(100, 600, 0, -32) }).actions).toEqual([]);
  });

  it("parries once while the blade is held up, and again only after it came down", () => {
    const up = ease(100, 500, 0, 45);
    const right = ease(100, 500, 0, 32);
    const held = classify({ pitch: up, yaw: right }, 2500);
    expect(held.actions).toEqual(["parry"]);
    const twice = classify({ pitch: sum(up, ease(1000, 500, 0, -45), ease(1800, 500, 0, 45)), yaw: sum(right, ease(1000, 500, 0, -32), ease(1800, 500, 0, 32)) }, 3000);
    expect(twice.actions).toEqual(["parry", "parry"]);
  });

  it("does not read bringing the sword quickly back down from a parry as a jab", () => {
    const pitch = sum(ease(100, 500, 0, 45), ease(900, 150, 0, -45));
    const yaw = sum(ease(100, 500, 0, 32), ease(900, 150, 0, -32));
    expect(classify({ pitch, yaw }, 2000).actions).toEqual(["parry"]);
  });

  it("jabs from the guard straight after a parry once the refractory period is over", () => {
    const pitch = sum(ease(100, 400, 0, 45), ease(600, 400, 0, -45));
    const yaw = sum(ease(100, 400, 0, 32), ease(600, 400, 0, -32));
    expect(classify({ pitch, yaw, accel: thrust(1300, 24) }, 2000).actions).toEqual(["parry", "jab"]);
  });

  it("waits for a blade already at the point to come down after a reset", () => {
    const classifier = new GestureClassifier(settings);
    const held = trace({ pitch: () => 0.8, yaw: () => 0.6 }, 500);
    expect(held.map((s) => classifier.update(s)).filter(Boolean)).toEqual([]);
  });

  it("measures a jab's peak for the practice step", () => {
    const { classifier } = classify({ accel: thrust(100, 36) });
    expect(classifier.lastStrike?.action).toBe("jab");
    expect(classifier.lastStrike!.peak).toBeGreaterThan(2.5);
  });

  it("catches a gentle jab at a lower level and not at the default", () => {
    const gentle = { accel: thrust(100, 9), spin: none };
    expect(classify(gentle).actions).toEqual([]);
    expect(classify(gentle, 1500, { strike: 0.6 }).actions).toEqual(["jab"]);
  });

  it("ignores a move that starts while the screen is being tapped", () => {
    const classifier = new GestureClassifier(settings);
    classifier.suppressUntil(250);
    const out = trace({ accel: sum(thrust(100, 24), thrust(700, 24)) }, 1200).map((s) => classifier.update(s));
    expect(out.filter(Boolean)).toEqual(["jab"]);
  });

  it("drops a jab still waiting when a tap is noted just after the move began", () => {
    const classifier = new GestureClassifier(settings);
    // The move starts at about 133 ms. The tap lands soon after, before the jab is confirmed.
    const out = trace({ accel: thrust(100, 24) }, 800).map((s) => {
      if (s.t >= 150) classifier.suppressUntil(150 + 150);
      return classifier.update(s);
    });
    expect(out.filter(Boolean)).toEqual([]);
  });
});
