import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { Bot } from "./bot";
import { botTactics } from "./bot-tactics";
import { GUARD } from "./sword";
import { hold, makeEngine, runUntil, toLive } from "./test-helpers";

/** A small fixed random sequence, so every run plays the same. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** How many swings the computer makes in `ms` of game time against a player who never moves. */
function swingsIn(level: BotLevel, ms: number): number {
  const { engine, events } = makeEngine();
  const bot = new Bot(2, { random: seeded(4), level: () => level });
  toLive(engine);
  const start = engine.now;
  // Stops early if the match ends, which only makes the harder level's count smaller.
  runUntil(engine, () => engine.now - start >= ms || engine.phase === "finish", ms + 100, () => {
    engine.control(1, { ...hold(-1, -1.1), move: 0 });
    bot.drive(engine);
  });
  return events.filter((e) => e.type === "swing" && e.slot === 2).length;
}

describe("botTactics", () => {
  it("gets quicker, sharper and busier from Easy to Hard", () => {
    const [easy, medium, hard] = (["easy", "medium", "hard"] as const).map(botTactics);
    expect(easy!.attackEvery.min).toBeGreaterThan(medium!.attackEvery.min);
    expect(medium!.attackEvery.min).toBeGreaterThan(hard!.attackEvery.min);
    expect(easy!.reaction.min).toBeGreaterThan(hard!.reaction.min);
    expect(easy!.blockChance).toBeLessThan(hard!.blockChance);
    expect(easy!.tempo).toBeGreaterThan(hard!.tempo);
  });

  it("never acts in Training", () => {
    const training = botTactics("training");
    expect(training.acts).toBe(false);
    expect(training.blockChance).toBe(0);
    expect(training.footwork).toBe(0);
  });
});

describe("Bot difficulty", () => {
  it("swings more often on Hard than on Easy", () => {
    expect(swingsIn("hard", 12_000)).toBeGreaterThan(swingsIn("easy", 12_000));
  });

  it("keeps its sword in guard and its feet planted in Training", () => {
    const { engine } = makeEngine();
    const bot = new Bot(2, { random: seeded(2), level: () => "training" });
    toLive(engine);
    const start = engine.fighters[2].x;
    for (let i = 0; i < 480; i++) {
      engine.control(1, { ...hold(0, 0.5), move: -1 });
      bot.drive(engine);
      engine.tick();
    }
    expect(engine.fighters[2].x).toBe(start);
    expect(engine.fighters[2].sword.control).toMatchObject({ yaw: GUARD.yaw, pitch: GUARD.pitch, reach: GUARD.reach });
  });
});
