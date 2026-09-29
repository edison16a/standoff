import { describe, expect, it } from "vitest";
import { AI_LEVELS, ComputerBoxer } from "./ai";
import { boxerSkill } from "./ai-difficulty";
import type { MatchEvent } from "./events";
import { Match } from "./match";
import { seeded } from "./random";
import { ofType } from "./test-helpers";

describe("computer boxer difficulty", () => {
  it("is slower to punch and worse at defending on easy", () => {
    const easy = boxerSkill("easy");
    const hard = boxerSkill("hard");
    for (let round = 1; round <= AI_LEVELS.length; round++) {
      const e = easy.levelFor(round);
      const h = hard.levelFor(round);
      expect(e.windup[0]).toBeGreaterThan(h.windup[0]);
      expect(e.gap[0]).toBeGreaterThan(h.gap[0]);
      expect(e.block).toBeLessThan(h.block);
      expect(e.counter).toBeLessThan(h.counter);
      expect(e.getUp[0][0]).toBeGreaterThan(h.getUp[0][0]);
    }
  });

  it("keeps medium as tuned and every chance short of certain", () => {
    expect(boxerSkill("medium").levelFor(2)).toEqual(AI_LEVELS[1]);
    for (let round = 1; round <= AI_LEVELS.length; round++) {
      const h = boxerSkill("hard").levelFor(round);
      for (const p of [h.block, h.dodge, h.counter, h.combo]) expect(p).toBeLessThanOrEqual(0.8);
    }
  });

  it("still gets sharper every round at each level", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const skill = boxerSkill(level);
      expect(skill.levelFor(4).windup[0]).toBeLessThan(skill.levelFor(1).windup[0]);
    }
  });

  it("stands still and never punches or defends in training, but gets up", () => {
    const match = new Match({ seed: 4 });
    const skill = boxerSkill("training");
    expect(skill.acts).toBe(false);
    const partner = new ComputerBoxer(1, seeded(2), skill.levelFor, skill.acts);
    match.footwork.anchored = 1;
    const player = new ComputerBoxer(0, seeded(3), boxerSkill("hard").levelFor);
    const events: MatchEvent[] = [];
    const spots: { x: number; z: number }[] = [];
    for (let t = 0; t < 200_000 && match.phase !== "over"; t += 20) {
      partner.update(match);
      player.update(match);
      const now = match.update(20);
      for (const event of now) {
        partner.hear(event, match);
        player.hear(event, match);
      }
      events.push(...now);
      if (match.phase === "fight" && match.round === 1) spots.push({ ...match.footwork.spots[1] });
    }
    expect(ofType(events, "throw").filter((e) => e.fighter === 1)).toEqual([]);
    expect(ofType(events, "block").filter((e) => e.target === 1)).toEqual([]);
    expect(ofType(events, "miss").filter((e) => e.target === 1 && e.dodge !== null)).toEqual([]);
    expect(ofType(events, "hit").filter((e) => e.target === 1).length).toBeGreaterThan(10);
    // Knocked back a little by punches at most, never walking about the ring.
    const xs = spots.map((s) => s.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.05);
    const downs = ofType(events, "knockdown").filter((e) => e.fighter === 1).length;
    const rises = ofType(events, "rise").filter((e) => e.fighter === 1).length;
    expect(downs).toBeGreaterThan(1);
    expect(rises).toBeGreaterThan(0);
  });
});
