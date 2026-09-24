import { describe, expect, it } from "vitest";
import { StrikeDetector } from "@/games/fencing/motion/strike-detector";
import { chop, trace } from "@/games/fencing/motion/traces";
import { DEFAULT_TUNING } from "@/games/fencing/tuning";
import { LISTEN_LEVEL, levelFor, Practice } from "./practice";

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
    expect(levelFor([0.6, 0.7])).toBe(0.45);
    expect(levelFor([5, 6, 7])).toBe(1.5);
    expect(levelFor([])).toBe(1);
  });

  it("tunes a gentle player so their own chop lands as a jab afterwards", () => {
    // A soft chop, too gentle for the default level.
    const gentle = () => trace({ down: chop(100, 9) }, 700);
    const settings = { jabThreshold: DEFAULT_TUNING.jabThreshold, parryThreshold: DEFAULT_TUNING.parryThreshold, refractoryMs: DEFAULT_TUNING.refractoryMs };
    const strict = new StrikeDetector(settings);
    expect(gentle().map((s) => strict.update(s)).filter(Boolean)).toEqual([]);

    const listening = new StrikeDetector(settings, { jab: LISTEN_LEVEL, parry: LISTEN_LEVEL });
    const practice = new Practice();
    for (let i = 0; i < 2; i++) {
      listening.reset();
      gentle().forEach((s) => listening.update(s));
      practice.record("jab", listening.lastStrike!.peak);
    }
    const tuned = new StrikeDetector(settings, practice.sensitivity);
    expect(gentle().map((s) => tuned.update(s)).filter(Boolean)).toEqual(["jab"]);
  });
});
