import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { ComputerBoxer } from "./ai";
import { aiActs, aiLevelFor } from "./ai-difficulty";
import type { MatchEvent } from "./events";
import { seeded } from "./random";
import { fighting, ofType } from "./test-helpers";

/** The computer boxer against a player who only stands there, until the round ends or someone goes down. */
function minute(level: BotLevel) {
  const match = fighting({ roundMs: 60_000 });
  const boxer = new ComputerBoxer(1, seeded(9), aiLevelFor(level), aiActs(level));
  if (!aiActs(level)) match.footwork.hold(1);
  const events: MatchEvent[] = [];
  const spots: { x: number; z: number }[] = [];
  for (let t = 0; t < 60_000 && match.phase === "fight"; t += 20) {
    boxer.update(match);
    const now = match.update(20);
    for (const event of now) boxer.hear(event, match);
    events.push(...now);
    spots.push({ ...match.footwork.spots[1] });
  }
  return { events, spots };
}

describe("computer boxer difficulty", () => {
  it("fights sharper from easy to hard in every round", () => {
    for (let round = 1; round <= 4; round++) {
      const [easy, medium, hard] = (["easy", "medium", "hard"] as const).map((level) => aiLevelFor(level)(round));
      expect(easy!.windup[0]).toBeGreaterThanOrEqual(medium!.windup[0]);
      expect(medium!.windup[0]).toBeGreaterThanOrEqual(hard!.windup[0]);
      expect(hard!.block).toBeGreaterThan(easy!.block);
    }
  });

  it("still gets sharper as the rounds go on", () => {
    const hard = aiLevelFor("hard");
    expect(hard(4).windup[0]).toBeLessThan(hard(1).windup[0]);
  });

  it("telegraphs its punches for less time on hard", () => {
    const windup = (level: BotLevel) => {
      const throws = ofType(minute(level).events, "throw");
      return throws.reduce((sum, t) => sum + t.windupMs, 0) / throws.length;
    };
    expect(windup("hard")).toBeLessThan(windup("easy"));
  });

  it("stands still and never throws in training", () => {
    const { events, spots } = minute("training");
    expect(ofType(events, "throw").filter((t) => t.fighter === 1)).toHaveLength(0);
    const first = spots[0]!;
    expect(spots.every((s) => s.x === first.x && s.z === first.z)).toBe(true);
  });
});
