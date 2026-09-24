import { describe, expect, it } from "vitest";
import { AI_LEVELS, ComputerBoxer } from "./ai";
import type { MatchEvent } from "./events";
import { RING_HALF } from "./footwork";
import { Match } from "./match";
import { seeded } from "./random";
import { ofType } from "./test-helpers";

/** Two computer boxers fight a whole match. */
function bout(seed: number): { match: Match; events: MatchEvent[]; maxGap: number } {
  const match = new Match({ seed });
  const random = seeded(seed * 31 + 5);
  const boxers = [new ComputerBoxer(0, random), new ComputerBoxer(1, random)];
  const events: MatchEvent[] = [];
  let maxGap = 0;
  for (let t = 0; t < 400_000 && match.phase !== "over"; t += 20) {
    for (const boxer of boxers) boxer.update(match);
    const now = match.update(20);
    for (const event of now) for (const boxer of boxers) boxer.hear(event, match);
    events.push(...now);
    maxGap = Math.max(maxGap, match.footwork.distance());
    for (const spot of match.footwork.spots) {
      expect(Math.abs(spot.x)).toBeLessThan(RING_HALF);
      expect(Math.abs(spot.z)).toBeLessThan(RING_HALF);
    }
  }
  return { match, events, maxGap };
}

describe("the computer boxer", () => {
  it("fights a whole match to a result", () => {
    const { match, events } = bout(3);
    expect(match.phase).toBe("over");
    expect(match.result).not.toBeNull();
    expect(ofType(events, "hit").length).toBeGreaterThan(10);
    expect(ofType(events, "block").length).toBeGreaterThan(3);
  });

  it("plays the same fight from the same seed", () => {
    const a = bout(11);
    const b = bout(11);
    expect(a.events.length).toBe(b.events.length);
    expect(a.match.result).toEqual(b.match.result);
  });

  it("winds up its punches long enough to react to, except quick follow ups", () => {
    // Against a player who only stands there, as a beginner might.
    const match = new Match({ seed: 5 });
    const boxer = new ComputerBoxer(1, seeded(9));
    const events: MatchEvent[] = [];
    for (let t = 0; t < 120_000 && match.phase !== "over"; t += 20) {
      boxer.update(match);
      const now = match.update(20);
      for (const event of now) boxer.hear(event, match);
      events.push(...now);
    }
    const throws = ofType(events, "throw");
    const slow = throws.filter((t) => t.windupMs >= AI_LEVELS[2]!.windup[0]);
    expect(slow.length / throws.length).toBeGreaterThan(0.5);
    expect(throws.every((t) => t.windupMs >= 250)).toBe(true);
  });

  it("gets sharper every round", () => {
    for (let i = 1; i < AI_LEVELS.length; i++) {
      expect(AI_LEVELS[i]!.windup[0]).toBeLessThan(AI_LEVELS[i - 1]!.windup[0]);
      expect(AI_LEVELS[i]!.block).toBeGreaterThan(AI_LEVELS[i - 1]!.block);
    }
  });
});

describe("footwork", () => {
  it("stays in fighting range while they trade", () => {
    const match = new Match({ seed: 2, introMs: 2500 });
    const gaps: number[] = [];
    for (let t = 0; t < 30_000; t += 20) {
      match.update(20);
      if (match.now > 3000) gaps.push(match.footwork.distance());
    }
    expect(Math.min(...gaps)).toBeGreaterThan(0.8);
    expect(Math.max(...gaps)).toBeLessThan(1.6);
  });
});
