import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { TRACKS } from "../tracks";
import { KART_BOT_SKILL } from "./bot-skill";
import { seeded } from "./random";
import { STEP } from "./tuning";
import { RaceWorld, type Entrant } from "./world";

/** Three computers and one player who never touches the pedals, so the difficulty applies. */
const GRID: Entrant[] = [
  { character: "blaze", seat: null },
  { character: "pip", seat: null },
  { character: "nova", seat: null },
  { character: "mochi", seat: 1 },
];

/** How far the computers got, in total, after some seconds of racing. */
function computerProgress(level: BotLevel, seconds: number): { world: RaceWorld; total: number } {
  const world = new RaceWorld(TRACKS[0]!, GRID, seeded(7), level);
  for (let i = 0; i < 60 * (seconds + 5); i++) world.step(STEP);
  const total = world.karts.filter((k) => k.seat === null).reduce((sum, k) => sum + k.race.progress, 0);
  return { world, total };
}

describe("computer kart difficulty", () => {
  it("gets sharper from easy to hard", () => {
    expect(KART_BOT_SKILL.easy.pace).toBeLessThan(KART_BOT_SKILL.medium.pace);
    expect(KART_BOT_SKILL.medium.pace).toBeLessThan(KART_BOT_SKILL.hard.pace);
    expect(KART_BOT_SKILL.easy.itemPatience).toBeGreaterThan(KART_BOT_SKILL.hard.itemPatience);
  });

  it("drives slower on easy than on hard", () => {
    const easy = computerProgress("easy", 40).total;
    const hard = computerProgress("hard", 40).total;
    expect(easy).toBeGreaterThan(300);
    expect(easy).toBeLessThan(hard * 0.95);
  }, 20_000);

  // Lazy steering must still make every bend and every glide jump.
  it.each(TRACKS.map((def) => [def.name, def] as const))("easy computers still finish %s", (_, def) => {
    const world = new RaceWorld(def, GRID.slice(0, 3), seeded(11), "easy");
    let falls = 0;
    for (let i = 0; i < 60 * 260 && world.phase !== "over"; i++) {
      world.step(STEP);
      falls += world.drainEvents().filter((e) => e.type === "fell").length;
    }
    expect(world.karts.every((k) => k.race.finished)).toBe(true);
    expect(falls).toBeLessThan(3);
  }, 30_000);

  it("parks the computers on the grid in training", () => {
    const { world, total } = computerProgress("training", 20);
    expect(total).toBeLessThanOrEqual(0);
    for (const kart of world.karts) if (kart.seat === null) expect(Math.hypot(kart.vx, kart.vz)).toBeLessThan(0.01);
  }, 20_000);

  it("still lets a dropped player's kart drive itself in training", () => {
    const world = new RaceWorld(TRACKS[0]!, GRID, seeded(3), "training");
    world.setAutopilot(3, true);
    for (let i = 0; i < 60 * 12; i++) world.step(STEP);
    expect(world.karts[3]!.race.progress).toBeGreaterThan(40);
  });
});
