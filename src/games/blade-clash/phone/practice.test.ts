import { describe, expect, it } from "vitest";
import { GestureClassifier, gestureSettings } from "@/games/blade-clash/motion/gesture";
import { thrust, trace } from "@/games/blade-clash/motion/traces";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { LEVEL_RANGE, LISTEN_LEVEL, levelFor, Practice } from "./practice";

const settings = gestureSettings(DEFAULT_TUNING);

describe("Practice", () => {
  it("asks for two jabs, then two parries, and ignores the wrong kind", () => {
    const practice = new Practice();
    expect(practice.record("parry", 2).right).toBe(false);
    practice.record("jab", 2);
    expect(practice.record("jab", 2.2).stage).toBe("parry");
    practice.record("parry", 1.8);
    expect(practice.record("parry", 1.6).stage).toBe("done");
  });

  it("sets each level to a share of the player's typical strike, within bounds", () => {
    expect(levelFor([2, 2.4])).toBeCloseTo(1.21);
    expect(levelFor([0.8, 0.9])).toBe(LEVEL_RANGE.min);
    expect(levelFor([5, 6, 7])).toBe(LEVEL_RANGE.max);
    expect(levelFor([])).toBe(1);
  });

  it("tunes a gentle player so their own soft jab lands afterwards", () => {
    // A soft jab, too gentle for the default level.
    const gentle = () => trace({ accel: thrust(100, 9) }, 700);
    const strict = new GestureClassifier(settings);
    expect(gentle().map((s) => strict.update(s)).filter(Boolean)).toEqual([]);

    const listening = new GestureClassifier(settings, { strike: LISTEN_LEVEL });
    const practice = new Practice();
    for (let i = 0; i < 2; i++) {
      listening.reset();
      gentle().forEach((s) => listening.update(s));
      practice.record("jab", listening.lastStrike!.peak);
    }
    const tuned = new GestureClassifier(settings, practice.sensitivity);
    expect(gentle().map((s) => tuned.update(s)).filter(Boolean)).toEqual(["jab"]);
  });

  it("never sets a level above what the weakest practice strike reached", () => {
    // A gentle practice that only just got through at the listening level.
    expect(levelFor([0.6, 0.7])).toBeCloseTo(0.51);
  });

  it("keeps ordinary jabs readable after one wild practice", () => {
    const listening = new GestureClassifier(settings, { strike: LISTEN_LEVEL });
    const practice = new Practice();
    for (let i = 0; i < 2; i++) {
      listening.reset();
      trace({ accel: thrust(100, 48) }, 700).forEach((s) => listening.update(s));
      practice.record("jab", listening.lastStrike!.peak);
    }
    const tuned = new GestureClassifier(settings, practice.sensitivity);
    // Half as hard, the way people strike once the bout is on.
    expect(trace({ accel: thrust(100, 20) }, 700).map((s) => tuned.update(s)).filter(Boolean)).toEqual(["jab"]);
  });
});
