import { describe, expect, it } from "vitest";
import { StrikeDetector, type Sensitivity, type StrikeSample } from "./strike-detector";
import { chop, flick, lift, pulse, sum, trace, type Motion } from "./traces";

const settings = { jabThreshold: 12, parryThreshold: 12, refractoryMs: 350 };

function detect(motion: Motion, ms = 1200, sensitivity?: Sensitivity) {
  const detector = new StrikeDetector(settings, sensitivity);
  return run(detector, trace(motion, ms));
}

function run(detector: StrikeDetector, samples: StrikeSample[]) {
  return samples.map((sample) => detector.update(sample)).filter(Boolean);
}

describe("StrikeDetector", () => {
  it("reads a sharp chop down as a jab and a sharp lift as a parry", () => {
    expect(detect({ down: chop(100, 24) })).toEqual(["jab"]);
    expect(detect({ down: lift(100, 24) })).toEqual(["parry"]);
  });

  it("never reads the brake at the end of a chop as a parry, even a hard one", () => {
    // The arm stops harder than it started, the case the old detector got wrong.
    expect(detect({ down: chop(100, 22, 1.3), pitchRate: flick(100, -6, 260) })).toEqual(["jab"]);
    expect(detect({ down: lift(100, 22, 1.3), pitchRate: flick(100, 6, 260) })).toEqual(["parry"]);
  });

  it("does not read the recoil of a chop as a parry when it wobbles late", () => {
    // Chop, brake, then a second overshoot upward 300 ms later.
    const down = sum(chop(100, 24), pulse(400, 80, -16));
    expect(detect({ down, pitchRate: sum(flick(100, -6), flick(330, -2)) })).toEqual(["jab"]);
  });

  it("catches a soft chop when the wrist does the work", () => {
    const soft = { down: chop(100, 9) };
    expect(detect({ ...soft, pitchRate: null })).toEqual([]);
    expect(detect({ ...soft, pitchRate: flick(90, -9) })).toEqual(["jab"]);
  });

  it("catches a chop angled toward the screen", () => {
    // 40 degrees off vertical: the straight down part alone would miss.
    const angled = { down: chop(100, 14 * Math.cos(0.7)), forward: chop(100, 14 * Math.sin(0.7)) };
    expect(detect(angled)).toEqual(["jab"]);
    expect(detect({ down: angled.down })).toEqual([]);
  });

  it("ignores a slow raise to aim, a thumb tap and a sideways sweep", () => {
    // Raising the sword: a long gentle push up.
    expect(detect({ down: pulse(100, 600, -9), pitchRate: flick(100, 2, 600) })).toEqual([]);
    // A thumb on the Forward button, read at 120 Hz: a sharp spike that barely moves the phone.
    const tap = trace({ down: sum(pulse(100, 30, 14), pulse(130, 40, -10)) }, 600, 0, 1000 / 120);
    expect(run(new StrikeDetector(settings), tap)).toEqual([]);
    // Swinging the blade across: nothing along either strike's line.
    expect(detect({ forward: pulse(100, 200, 6) })).toEqual([]);
  });

  it("fires the same strike again once the refractory period is over", () => {
    expect(detect({ down: sum(chop(100, 24), chop(520, 24)) })).toEqual(["jab", "jab"]);
    expect(detect({ down: sum(chop(100, 24), chop(300, 24)) })).toEqual(["jab"]);
  });

  it("still reads a parry that starts with a small dip", () => {
    // People often drop the hand a little before lifting it.
    expect(detect({ down: sum(pulse(80, 90, 4), lift(200, 22)), pitchRate: flick(200, 5) })).toEqual(["parry"]);
  });

  it("does not let a gyroscope read backwards turn a chop into a parry", () => {
    // Even with the turn counted the wrong way, a clean chop stays a jab and its brake stays quiet.
    expect(detect({ down: chop(100, 24), pitchRate: flick(100, 6) })).toEqual(["jab"]);
  });

  it("lets a real parry follow a jab, just a little later than a repeat", () => {
    expect(detect({ down: sum(chop(100, 24), lift(620, 24)), pitchRate: flick(620, 5) })).toEqual(["jab", "parry"]);
  });

  it("follows the player's sensitivity from the practice step", () => {
    const gentle = { down: chop(100, 10) };
    expect(detect(gentle)).toEqual([]);
    expect(detect(gentle, 1200, { jab: 0.6, parry: 0.6 })).toEqual(["jab"]);
    expect(detect({ down: chop(100, 18) }, 1200, { jab: 1.6, parry: 1 })).toEqual([]);
  });

  it("stays quiet while suppressed around a screen tap", () => {
    const detector = new StrikeDetector(settings);
    detector.suppressUntil(200);
    expect(run(detector, trace({ down: chop(100, 24) }, 600))).toEqual([]);
  });

  it("reports how hard the last strike was", () => {
    const detector = new StrikeDetector(settings);
    run(detector, trace({ down: chop(100, 30) }, 600));
    expect(detector.lastStrike?.action).toBe("jab");
    expect(detector.lastStrike!.peak).toBeGreaterThan(2);
  });
});
