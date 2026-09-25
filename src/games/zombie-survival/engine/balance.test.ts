import { describe, expect, it } from "vitest";
import { teamCount } from "./encounter";
import { CLEAR_SECONDS, WALK_SPEED } from "./pacing";
import { segment } from "./route";
import { simulateRun, type Bot } from "./sim";
import { STAGES } from "./stages";
import { WEAPON_IDS } from "./weapons";

/** Seconds spent fighting over a whole run, and the zombies put down in them. */
function fighting(bots: readonly Bot[]): { seconds: number; dead: number } {
  const run = simulateRun(bots);
  const seconds = run.results.reduce((sum, r) => sum + r.seconds, 0);
  const dead = STAGES.reduce((sum, s) => sum + teamCount(s, bots.length) + (s.boss ? 1 : 0), 0);
  return { seconds, dead };
}

/**
 * The difficulty curve, checked with bots standing in for players. A bot's
 * skill is how often its bullets land where it aims, shrinking with
 * distance as a real hand would. Easy start, tough end, always winnable
 * with good aim, whichever gun you pick.
 */
describe("the difficulty curve", () => {
  it("lets steady aim clear the whole route alone, with any gun", () => {
    for (const weapon of WEAPON_IDS) {
      const run = simulateRun([{ seat: 1, weapon, skill: 0.7 }]);
      expect(run.reached, weapon).toBe(26);
    }
  });

  it("lets a steady team of two and of four clear it too", () => {
    const two = simulateRun([
      { seat: 1, weapon: "rifle", skill: 0.7 },
      { seat: 2, weapon: "shotgun", skill: 0.7 },
    ]);
    expect(two.reached).toBe(26);
    const four = simulateRun(WEAPON_IDS.map((weapon, i) => ({ seat: i + 1, weapon, skill: 0.7 })));
    expect(four.reached).toBe(26);
  });

  it("stops sloppy aim well before the ship", () => {
    for (const weapon of WEAPON_IDS) {
      const run = simulateRun([{ seat: 1, weapon, skill: 0.3 }]);
      expect(run.reached, weapon).toBeLessThan(26);
    }
  });

  it("stops a sloppy team too, however many guns it has", () => {
    const two = simulateRun([
      { seat: 1, weapon: "rifle", skill: 0.3 },
      { seat: 2, weapon: "shotgun", skill: 0.3 },
    ]);
    expect(two.reached).toBeLessThan(26);
    const four = simulateRun(WEAPON_IDS.map((weapon, i) => ({ seat: i + 1, weapon, skill: 0.3 })));
    expect(four.reached).toBeLessThan(26);
  });

  it("starts gentle: nobody gets hurt in the first four stages", () => {
    const run = simulateRun([{ seat: 1, weapon: "smg", skill: 0.3 }], 1, 4);
    expect(run.results.every((r) => r.healthLost <= 0)).toBe(true);
  });

  it("gets faster, tougher and closer stage by stage", () => {
    const plain = STAGES.filter((s) => !s.boss);
    for (let i = 1; i < plain.length; i++) {
      const [a, b] = [plain[i - 1]!, plain[i]!];
      expect(b.speed).toBeGreaterThanOrEqual(a.speed);
      expect(b.tough).toBeGreaterThanOrEqual(a.tough);
      expect(b.gap).toBeLessThanOrEqual(a.gap);
    }
    expect(STAGES[24]!.spawn[0]).toBeLessThan(STAGES[0]!.spawn[0]);
  });

  it("keeps the run brisk: short walks, short stops, and the dead coming thick and fast", () => {
    for (const s of STAGES) expect(segment(s.index).length / WALK_SPEED, s.title).toBeLessThan(15);
    expect(CLEAR_SECONDS).toBeLessThanOrEqual(3);
    const solo = fighting([{ seat: 1, weapon: "rifle", skill: 0.7 }]);
    expect(solo.dead / solo.seconds).toBeGreaterThan(0.6);
  });

  it("gives a bigger team more of the dead, not longer fights", () => {
    const solo = fighting([{ seat: 1, weapon: "rifle", skill: 0.7 }]);
    const four = fighting(WEAPON_IDS.map((weapon, i) => ({ seat: i + 1, weapon, skill: 0.7 })));
    expect(four.dead).toBeGreaterThan(solo.dead * 2);
    expect(four.seconds).toBeLessThan(solo.seconds * 1.25);
  });
});
