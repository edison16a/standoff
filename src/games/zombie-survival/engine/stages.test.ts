import { describe, expect, it } from "vitest";
import { teamCount } from "./spawner";
import { BOSS_EVERY, CHOPPER_STAGE, STAGE_COUNT, STAGES, stageSpeed } from "./stages";
import { isMiniBoss } from "./zombie-kinds";

/** Everything a single player has to put down on a stage, bosses included. */
const total = (index: number) => {
  const s = STAGES[index - 1]!;
  return teamCount(s, 1) + s.bosses.length;
};

describe("the stages", () => {
  it("keeps fifteen of them, with the chopper after the tenth", () => {
    expect(STAGES).toHaveLength(STAGE_COUNT);
    expect(STAGE_COUNT).toBe(15);
    expect(CHOPPER_STAGE).toBe(10);
  });

  it("runs ten percent faster each stage, from the kinds' own pace up to twice it", () => {
    expect(STAGES[0]!.speed).toBe(1);
    for (let i = 1; i < STAGES.length; i++) {
      const [a, b] = [STAGES[i - 1]!, STAGES[i]!];
      expect(b.speed).toBeCloseTo(Math.min(2, a.speed + 0.1), 6);
    }
    expect(stageSpeed(11)).toBe(2);
    expect(STAGES.at(-1)!.speed).toBe(2);
  });

  it("brings a big boss every fifth stage and a mini boss every other stage between", () => {
    for (const s of STAGES) {
      if (s.index % BOSS_EVERY === 0) {
        expect(s.tier, `stage ${s.index}`).toBe("boss");
        expect(s.bosses.every((k) => !isMiniBoss(k))).toBe(true);
      } else if (s.tier === "mini") {
        expect(s.bosses.length).toBeGreaterThan(0);
        expect(s.bosses.every(isMiniBoss)).toBe(true);
      } else {
        expect(s.bosses).toHaveLength(0);
      }
    }
    expect(STAGES.filter((s) => s.tier === "mini").map((s) => s.index)).toEqual([2, 4, 7, 9, 12, 14]);
    expect(STAGES.filter((s) => s.tier === "boss").map((s) => s.index)).toEqual([5, 10, 15]);
  });

  it("puts the boss on the roof before the chopper, and the Behemoth at the end", () => {
    expect(STAGES[CHOPPER_STAGE - 1]!.bosses).toEqual(["tank"]);
    expect(STAGES[STAGE_COUNT - 1]!.bosses).toEqual(["behemoth"]);
    expect(STAGES[1]!.bosses).toEqual(["butcher"]);
  });

  it("sends runners in behind every big boss", () => {
    for (const s of STAGES.filter((s) => s.tier === "boss")) {
      expect(s.rush).not.toBeNull();
      expect(s.mix).toEqual({ walker: 0, runner: 1, brute: 0, armored: 0 });
    }
  });

  it("keeps rounds short: ten at most early on, about twenty at the end", () => {
    for (let i = 1; i <= 5; i++) expect(total(i), `stage ${i}`).toBeLessThanOrEqual(10);
    for (let i = 13; i <= 15; i++) {
      expect(total(i), `stage ${i}`).toBeGreaterThanOrEqual(16);
      expect(total(i), `stage ${i}`).toBeLessThanOrEqual(22);
    }
    for (const s of STAGES) expect(total(s.index)).toBeLessThanOrEqual(22);
  });

  it("gives a bigger team a few more of the dead, never a second wave", () => {
    for (const s of STAGES) {
      expect(teamCount(s, 4)).toBeGreaterThan(teamCount(s, 1));
      expect(teamCount(s, 4)).toBeLessThan(teamCount(s, 1) * 2);
    }
  });
});
