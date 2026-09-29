import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { SurvivalGame } from "./game";
import { HORDE, hordeStage } from "./horde-level";
import { stage } from "./stages";
import { alive } from "./zombie";

const DT = 1 / 60;

/** A team that never shoots, left in the first fight for `seconds`. */
function standBy(level: BotLevel, seconds: number): SurvivalGame {
  const game = new SurvivalGame(Math.random, level);
  game.start([{ seat: 1, weapon: "rifle" }]);
  for (let t = 0; t < 60 && game.phase !== "fight"; t += DT) game.update(DT);
  for (let t = 0; t < seconds && game.phase === "fight"; t += DT) game.update(DT);
  return game;
}

describe("horde difficulty", () => {
  it("gets faster and harder from easy to hard", () => {
    expect(HORDE.easy.speed).toBeLessThan(HORDE.medium.speed);
    expect(HORDE.medium.speed).toBeLessThan(HORDE.hard.speed);
    expect(HORDE.easy.harm).toBeLessThan(HORDE.medium.harm);
    expect(HORDE.medium.harm).toBeLessThan(HORDE.hard.harm);
  });

  it("keeps medium as the run was first tuned", () => {
    const spec = stage(4);
    expect(hordeStage(spec, "medium")).toEqual(spec);
  });

  it("hurts a team that does nothing less on easy than on hard", () => {
    const easy = standBy("easy", 25).health;
    const hard = standBy("hard", 25).health;
    expect(hard).toBeLessThan(easy);
  });

  it("raises the dead where they stand in training", () => {
    const game = standBy("training", 1);
    const first = new Map(game.encounter!.zombies.map((z) => [z.id, z.ahead]));
    for (let t = 0; t < 20; t += DT) game.update(DT);
    expect(game.health).toBe(100);
    const standing = game.encounter!.zombies.filter(alive);
    expect(standing.length).toBeGreaterThan(0);
    for (const z of standing) if (first.has(z.id)) expect(z.ahead).toBe(first.get(z.id));
  });
});
