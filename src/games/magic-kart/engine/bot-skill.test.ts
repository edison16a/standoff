import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { KART_BOT_SKILL } from "./bot-skill";
import { seeded } from "./random";
import { OVAL } from "./test-track";
import { STEP } from "./tuning";
import { RaceWorld } from "./world";

/** One computer kart and one player who holds Drive, run for `seconds` of racing. */
function race(level: BotLevel, seconds: number) {
  const world = new RaceWorld(OVAL, [{ character: "blaze", seat: null, level }, { character: "pip", seat: 1 }], seeded(3));
  world.setInput(1, { steer: 0, throttle: true, brake: false });
  const events: string[] = [];
  while (world.time < seconds) {
    world.step(STEP);
    for (const e of world.drainEvents()) if (e.type !== "countdown" && "kart" in e && e.kart === 0) events.push(e.type);
  }
  return { bot: world.karts[0]!, events };
}

describe("computer kart difficulty", () => {
  it("gets quicker from easy to hard", () => {
    expect(KART_BOT_SKILL.easy.pace).toBeLessThan(KART_BOT_SKILL.medium.pace);
    expect(KART_BOT_SKILL.medium.pace).toBeLessThan(KART_BOT_SKILL.hard.pace);
    const easy = race("easy", 12).bot.race.progress;
    const hard = race("hard", 12).bot.race.progress;
    expect(hard).toBeGreaterThan(easy);
  });

  it("parks a training kart on the grid without putting it back", () => {
    const { bot, events } = race("training", 12);
    expect(Math.hypot(bot.vx, bot.vz)).toBe(0);
    expect(bot.race.stuckTime).toBe(0);
    expect(events).not.toContain("respawn");
    expect(events).not.toContain("boost");
  });

  it("keeps a player's kart on autopilot at full skill in training", () => {
    const world = new RaceWorld(OVAL, [{ character: "blaze", seat: null, level: "training" }, { character: "pip", seat: 1, level: "training" }], seeded(3));
    world.setAutopilot(1, true);
    while (world.time < 8) world.step(STEP);
    expect(world.karts[1]!.race.progress).toBeGreaterThan(40);
  });
});
