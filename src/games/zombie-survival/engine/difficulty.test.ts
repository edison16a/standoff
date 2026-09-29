import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { tiltStage, ZOMBIE_SKILL } from "./difficulty";
import { SurvivalGame } from "./game";
import { MAX_HEALTH } from "./pacing";
import { stage } from "./stages";
import { alive } from "./zombie";

const DT = 1 / 60;

/** A team of one that never shoots, some seconds into the first fight. */
function idle(level: BotLevel, seconds: number): SurvivalGame {
  const game = new SurvivalGame(() => 0.5, level);
  game.start([{ seat: 1, weapon: "rifle" }]);
  for (let t = 0; t < 20 && game.phase !== "fight"; t += DT) game.update(DT);
  for (let t = 0; t < seconds && game.phase === "fight"; t += DT) game.update(DT);
  return game;
}

describe("zombie difficulty", () => {
  it("plays the run as written on easy, and faster and harder above it, with the same count", () => {
    const base = stage(5);
    expect(tiltStage(base, "easy").speed).toBe(base.speed);
    const medium = tiltStage(base, "medium");
    const hard = tiltStage(base, "hard");
    expect(medium.speed).toBeGreaterThan(base.speed);
    expect(hard.speed).toBeGreaterThan(medium.speed);
    expect(hard.harm).toBeGreaterThan(base.harm);
    expect(hard.count).toBe(base.count);
    expect(hard.bosses).toEqual(base.bosses);
  });

  it("starts easy at the kinds' own pace and ends it at twice that", () => {
    expect(tiltStage(stage(1), "easy").speed).toBe(1);
    expect(tiltStage(stage(15), "easy").speed).toBe(2);
  });

  it("gets tougher from easy to hard", () => {
    expect(ZOMBIE_SKILL.easy.speed).toBeLessThan(ZOMBIE_SKILL.medium.speed);
    expect(ZOMBIE_SKILL.medium.speed).toBeLessThan(ZOMBIE_SKILL.hard.speed);
    expect(ZOMBIE_SKILL.easy.harm).toBeLessThan(ZOMBIE_SKILL.hard.harm);
  });

  it("hurts an idle team less on easy than on hard", () => {
    const easy = idle("easy", 25);
    const hard = idle("hard", 25);
    expect(hard.health).toBeLessThan(MAX_HEALTH);
    expect(MAX_HEALTH - easy.health).toBeLessThan(MAX_HEALTH - hard.health);
  });

  it("keeps training zombies where they appear, never swinging", () => {
    const game = idle("training", 30);
    expect(game.phase).toBe("fight");
    expect(game.health).toBe(MAX_HEALTH);
    const standing = game.encounter!.zombies.filter(alive);
    expect(standing.length).toBeGreaterThan(0);
    for (const z of standing) {
      expect(z.state).toBe("walk");
      expect(z.ahead).toBeGreaterThan(10);
    }
  });
});
