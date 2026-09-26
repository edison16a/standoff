import { describe, expect, it } from "vitest";
import type { Piece } from "./arena";
import { BotAim, SKILLS } from "./bot-aim";
import type { Difficulty, Fighter } from "./fighter";
import type { GunId } from "./guns";
import { Rng } from "./rng";
import { coneOf, resolveShot } from "./shooting";
import { fighterAt } from "./test-helpers";

const DT = 1 / 60;

/** A bot shooting at a fighter standing still, for `seconds`. Returns shots, hits and the first shot time. */
function duel(level: Difficulty, gun: GunId, distance: number, seconds: number, pieces: Piece[] = [], seed = 5) {
  const bot = fighterAt(0, 0, 0, 0, gun, level);
  const target: Fighter = fighterAt(1, 1, 2, distance);
  target.health = 1e6;
  const aim = new BotAim();
  const rng = new Rng(seed);
  let shots = 0;
  let hits = 0;
  let first: number | null = null;
  for (let t = 0; t < seconds; t += DT) {
    bot.gun.update(DT);
    const intent = aim.update(bot, [target], pieces, rng, t, DT);
    if (!intent.pull) continue;
    const at = { yaw: bot.aim.yaw + bot.gun.kick.yaw, pitch: bot.aim.pitch + bot.gun.kick.pitch };
    const cone = coneOf(bot);
    if (bot.gun.trigger(t, rng) !== "fired") continue;
    first ??= t;
    shots += 1;
    if (resolveShot(bot, at, cone, { pieces, fighters: [bot, target], rng, now: t }).some((e) => e.type === "hit")) hits += 1;
  }
  return { shots, hits, first };
}

describe("computer players", () => {
  it("wait a reaction time before the first shot, shorter for better bots", () => {
    const easy = duel("easy", "rifle", 15, 3).first!;
    const hard = duel("hard", "rifle", 15, 3).first!;
    expect(easy).toBeGreaterThanOrEqual(SKILLS.easy.reaction - 2 * DT);
    expect(hard).toBeGreaterThanOrEqual(SKILLS.hard.reaction - 2 * DT);
    expect(hard).toBeLessThan(easy);
  });

  it("hit more often the harder they are", () => {
    const rate = (level: Difficulty) => {
      let shots = 0;
      let hits = 0;
      for (const seed of [1, 2, 3]) {
        const r = duel(level, "rifle", 25, 4, [], seed);
        shots += r.shots;
        hits += r.hits;
      }
      return hits / shots;
    };
    const easy = rate("easy");
    const hard = rate("hard");
    expect(hard).toBeGreaterThan(easy + 0.1);
    expect(easy).toBeGreaterThan(0.1);
    expect(hard).toBeLessThan(1);
  });

  it("fire automatic guns in bursts, not one endless spray", () => {
    const { shots } = duel("normal", "smg", 12, 4);
    expect(shots).toBeGreaterThan(10);
    expect(shots).toBeLessThan(4 * 13 * 0.8);
  });

  it("never shoot at what they cannot see", () => {
    const wall: Piece = { id: 0, kind: "wall", x: 1, z: 8, shape: { type: "box", hw: 3, hd: 0.3 }, h: 2.5 };
    expect(duel("hard", "rifle", 15, 3, [wall]).shots).toBe(0);
  });

  it("hold buckshot until the enemy is in reach", () => {
    expect(duel("hard", "shotgun", 40, 3).shots).toBe(0);
    expect(duel("hard", "shotgun", 8, 3).shots).toBeGreaterThan(0);
  });

  it("reload between fights when the magazine runs low", () => {
    const bot = fighterAt(0, 0, 0, 0, "rifle");
    bot.gun.ammo = 5;
    const intent = new BotAim().update(bot, [], [], new Rng(1), 0, DT);
    expect(intent).toEqual({ pull: false, reload: true, engaged: false });
  });
});
