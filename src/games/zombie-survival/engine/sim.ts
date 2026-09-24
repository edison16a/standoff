import type { Seat } from "@/platform/protocol";
import { SurvivalGame } from "./game";
import { Rng } from "./rng";
import type { CastFn } from "./shooting";
import { alive, type Zombie } from "./zombie";
import type { WeaponId } from "./weapons";

/**
 * A stand in for real players, for balancing. Each bot takes a moment to
 * find a new target, then fires at the gun's rate. `skill` is the chance
 * a bullet lands where it was aimed: head, a weak point, or at worst the
 * body. The rest miss or clip a limb. Used by the tests to check that
 * steady aim clears the whole route and wild spraying does not.
 */
export interface Bot {
  seat: Seat;
  weapon: WeaponId;
  skill: number;
}

const DT = 1 / 30;
/** Seconds a person needs to swing onto a new target. */
const ACQUIRE = 0.8;

export interface StageResult {
  stage: number;
  cleared: boolean;
  healthLost: number;
  seconds: number;
}

function nearest(game: SurvivalGame): Zombie | undefined {
  return game.encounter?.zombies.filter(alive).sort((a, b) => a.ahead - b.ahead)[0];
}

/** Plays one stage's fight from its start with the given health. */
export function simulateStage(stage: number, bots: readonly Bot[], health: number, seed = 1): StageResult {
  const rng = new Rng(seed * 101 + stage);
  const game = new SurvivalGame();
  game.start(bots.map((b) => ({ seat: b.seat, weapon: b.weapon })), stage);
  while (game.phase === "travel") game.update(0.5);
  game.health = health;
  const start = health;
  const aiming = new Map<Seat, { target: number; ready: number }>();
  let t = 0;
  while (game.phase === "fight" && t < 400) {
    t += DT;
    for (const bot of bots) {
      const target = nearest(game);
      if (!target) continue;
      const aim = aiming.get(bot.seat);
      if (!aim || aim.target !== target.id) {
        aiming.set(bot.seat, { target: target.id, ready: t + ACQUIRE * (0.8 + rng.next() * 0.4) });
        continue;
      }
      if (t < aim.ready) continue;
      const cast: CastFn = (offsets) =>
        offsets.map(() => {
          // Far targets are small on screen: a shaky hand finds them less often.
          const size = Math.min(1, 10 / Math.max(3, target.ahead));
          // Shotgun pellets spread: fewer find the target the further away it is.
          const spread = offsets.length > 1 ? Math.min(1, 8 / Math.max(3, target.ahead)) : 1;
          const p = bot.skill * size * spread;
          const roll = rng.next();
          const weak = target.weak.findIndex((hp) => hp > 0);
          if (weak >= 0) {
            if (roll < p * 0.55) return { zombie: target.id, part: "weak", weak };
            return roll < p * 1.3 ? { zombie: target.id, part: "body", weak: null } : null;
          }
          if (roll > p) return null;
          if (roll < p * 0.3) return { zombie: target.id, part: "head", weak: null };
          return { zombie: target.id, part: roll > p * 0.85 ? "limb" : "body", weak: null };
        });
      game.fire(bot.seat, cast);
    }
    game.update(DT);
  }
  return { stage, cleared: game.phase !== "down" && game.phase !== "fight", healthLost: start - game.health, seconds: t };
}

/** Plays the whole route from a stage, healing at checkpoints as the game does. Returns where it ended. */
export function simulateRun(bots: readonly Bot[], from = 1, to = 25, seed = 1): { reached: number; results: StageResult[] } {
  let health = 100;
  const results: StageResult[] = [];
  for (let stage = from; stage <= to; stage++) {
    const result = simulateStage(stage, bots, health, seed);
    results.push(result);
    if (!result.cleared) return { reached: stage, results };
    health = Math.min(100, health - result.healthLost + 15);
  }
  return { reached: to + 1, results };
}
