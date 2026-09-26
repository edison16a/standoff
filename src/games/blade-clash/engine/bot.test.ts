import { describe, expect, it } from "vitest";
import { Bot, blockToward } from "./bot";
import { ATTACKS, attackHold, attackLength } from "./bot-moves";
import { closestBetween } from "./geometry";
import { GUARD, swordPose } from "./sword";
import { hold, makeEngine, runUntil, toLive } from "./test-helpers";
import { CHARACTERS } from "@/games/blade-clash/characters";

/** A small fixed random sequence, so every run plays the same. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("Bot", () => {
  it("steps in and lands hits on a player who just stands there", () => {
    const { engine, events } = makeEngine();
    const bot = new Bot(2, seeded(3));
    toLive(engine);
    runUntil(engine, () => events.some((e) => e.type === "hit" && e.attacker === 2), 20_000, () => {
      engine.control(1, { ...hold(-1, -1.1), move: 0 });
      bot.drive(engine);
    });
    expect(engine.fighters[1].health).toBeLessThan(5);
  });

  it("wins a whole fight against a player who never moves, then asks for a rematch", () => {
    const { engine, events } = makeEngine();
    const bot = new Bot(2, seeded(11));
    toLive(engine);
    runUntil(engine, () => engine.phase === "matchOver", 180_000, () => {
      engine.control(1, { ...hold(-1, -1.1), move: 0 });
      bot.drive(engine);
    });
    expect(events.find((e) => e.type === "matchWon")).toMatchObject({ winner: 2 });
    bot.drive(engine);
    expect(engine.match.rematchVotes[2]).toBe(true);
  });

  it("fights itself to a finish, with clashes along the way", () => {
    const { engine, events } = makeEngine({ 1: "block", 2: "star" });
    const bots = [new Bot(1, seeded(5)), new Bot(2, seeded(9))];
    toLive(engine);
    runUntil(engine, () => engine.phase === "matchOver", 300_000, () => bots.forEach((bot) => bot.drive(engine)));
    expect(events.some((e) => e.type === "clash")).toBe(true);
    expect(events.filter((e) => e.type === "hit").length).toBeGreaterThanOrEqual(5);
  });
});

describe("bot moves", () => {
  it("starts where the blade was, strikes through, and ends back in guard", () => {
    const start = hold(0.3, 0.2);
    for (const attack of ATTACKS) {
      expect(attackHold(attack, start, 0)).toMatchObject({ yaw: start.yaw, pitch: start.pitch });
      expect(attackHold(attack, start, attack.windUpMs + attack.strikeMs - 0.001).yaw).toBeCloseTo(attack.to.yaw, 2);
      const end = attackHold(attack, start, attackLength(attack));
      expect(end.yaw).toBeCloseTo(GUARD.yaw);
      expect(end.pitch).toBeCloseTo(GUARD.pitch);
    }
  });

  it("blocks by pointing its blade at the middle of the other one", () => {
    const blade = CHARACTERS.knight.blade;
    const theirs = swordPose(0.8, -1, hold(0, 0.6, 0.5), blade);
    const mine = swordPose(-0.8, 1, GUARD, blade);
    const frame = (x: number, facing: 1 | -1, sword: typeof mine) => ({ x, facing, sword }) as Parameters<typeof blockToward>[0];
    const block = blockToward(frame(-0.8, 1, mine), frame(0.8, -1, theirs));
    const after = swordPose(-0.8, 1, block, blade);
    // The blade now lies across the other one.
    expect(closestBetween({ a: after.base, b: after.tip }, { a: theirs.base, b: theirs.tip }).distance).toBeLessThan(0.08);
  });
});
