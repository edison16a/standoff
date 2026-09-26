import { describe, expect, it } from "vitest";
import { teamCount } from "./encounter";
import { HELIPAD } from "./chopper";
import { CLEAR_SECONDS, FLY_SPEED, WALK_SPEED } from "./pacing";
import { segment } from "./route";
import { simulateRun, type Bot } from "./sim";
import { CHOPPER_STAGE, STAGE_COUNT, STAGES } from "./stages";
import { WEAPON_IDS } from "./weapons";

/** Seconds spent fighting over a whole run, and the zombies put down in them. */
function fighting(bots: readonly Bot[]): { seconds: number; dead: number } {
  const run = simulateRun(bots);
  const seconds = run.results.reduce((sum, r) => sum + r.seconds, 0);
  const dead = STAGES.reduce((sum, s) => sum + teamCount(s, bots.length) + (s.boss ? 1 : 0), 0);
  return { seconds, dead };
}

/** Where a run that clears every stage ends up. */
const END = STAGE_COUNT + 1;

/** Seconds on the way to a stage: a run, or the chopper ride from the helipad. */
function legSeconds(index: number): number {
  const length = segment(index).length;
  return index === CHOPPER_STAGE + 1 ? (length - HELIPAD) / FLY_SPEED : length / WALK_SPEED;
}

/**
 * The difficulty curve, checked with bots standing in for players. A bot's
 * skill is how often its bullets land where it aims, shrinking with
 * distance as a real hand would. A busy start, a tough end, always winnable
 * with good aim, whichever gun you pick.
 */
describe("the difficulty curve", () => {
  it("lets steady aim clear the whole route alone, with any gun", () => {
    for (const weapon of WEAPON_IDS) {
      const run = simulateRun([{ seat: 1, weapon, skill: 0.7 }]);
      expect(run.reached, weapon).toBe(END);
    }
  });

  it("lets a steady team of two and of four clear it too", () => {
    const two = simulateRun([
      { seat: 1, weapon: "rifle", skill: 0.7 },
      { seat: 2, weapon: "shotgun", skill: 0.7 },
    ]);
    expect(two.reached).toBe(END);
    const four = simulateRun(WEAPON_IDS.map((weapon, i) => ({ seat: i + 1, weapon, skill: 0.7 })));
    expect(four.reached).toBe(END);
  });

  it("stops sloppy aim well before the ship", () => {
    for (const weapon of WEAPON_IDS) {
      const run = simulateRun([{ seat: 1, weapon, skill: 0.3 }]);
      expect(run.reached, weapon).toBeLessThan(END);
    }
  });

  it("stops a sloppy team too, however many guns it has", () => {
    const two = simulateRun([
      { seat: 1, weapon: "rifle", skill: 0.3 },
      { seat: 2, weapon: "shotgun", skill: 0.3 },
    ]);
    expect(two.reached).toBeLessThan(END);
    const four = simulateRun(WEAPON_IDS.map((weapon, i) => ({ seat: i + 1, weapon, skill: 0.3 })));
    expect(four.reached).toBeLessThan(END);
  });

  it("opens busy but fair: a crowd on the first street and a boss in the second stage", () => {
    expect(STAGES[0]!.count).toBeGreaterThanOrEqual(15);
    expect(STAGES[1]!.boss).toBeDefined();
    expect(STAGES[STAGE_COUNT - 1]!.boss).toBe("behemoth");
    for (const weapon of WEAPON_IDS) {
      const run = simulateRun([{ seat: 1, weapon, skill: 0.7 }], 1, 2);
      expect(run.results.every((r) => r.healthLost < 35), weapon).toBe(true);
    }
  });

  it("gets faster, tougher and closer stage by stage", () => {
    const plain = STAGES.filter((s) => !s.boss);
    for (let i = 1; i < plain.length; i++) {
      const [a, b] = [plain[i - 1]!, plain[i]!];
      expect(b.speed).toBeGreaterThanOrEqual(a.speed);
      expect(b.tough).toBeGreaterThanOrEqual(a.tough);
      expect(b.gap).toBeLessThanOrEqual(a.gap);
    }
    expect(STAGES[STAGE_COUNT - 1]!.spawn[0]).toBeLessThan(STAGES[0]!.spawn[0]);
  });

  it("keeps the run brisk: short walks, short stops, and the dead coming thick and fast", () => {
    for (const s of STAGES) expect(legSeconds(s.index), s.title).toBeLessThan(8);
    expect(CLEAR_SECONDS).toBeLessThanOrEqual(2);
    const solo = fighting([{ seat: 1, weapon: "rifle", skill: 0.7 }]);
    expect(solo.dead / solo.seconds).toBeGreaterThan(0.62);
    // Fifteen short fights, not a long slog: under half a minute each on average.
    expect(solo.seconds / STAGE_COUNT).toBeLessThan(30);
  });

  it("gives a bigger team more of the dead, not longer fights", () => {
    const solo = fighting([{ seat: 1, weapon: "rifle", skill: 0.7 }]);
    const four = fighting(WEAPON_IDS.map((weapon, i) => ({ seat: i + 1, weapon, skill: 0.7 })));
    expect(four.dead).toBeGreaterThan(solo.dead * 2);
    expect(four.seconds).toBeLessThan(solo.seconds * 1.25);
  });
});
