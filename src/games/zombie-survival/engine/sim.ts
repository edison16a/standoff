import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { Seat } from "@/platform/protocol";
import { SurvivalGame } from "./game";
import { MAX_HEALTH } from "./pacing";
import { Rng } from "./rng";
import type { CastFn } from "./shooting";
import { aimPoint, traceShot } from "./sim-aim";
import { STAGE_COUNT } from "./stages";
import { reach } from "./weapon-card";
import { WEAPONS, type WeaponId } from "./weapons";
import { alive, type Zombie } from "./zombie";
import { isBoss } from "./zombie-kinds";

/**
 * Stand ins for real players, for balancing. A bot swings onto a target,
 * aims at its head or a weak point with a shaky hand, and fires through
 * the real gun: its spread, its range and its kick. The shots are traced
 * against every zombie on the road, so stray pellets can hit a neighbour.
 */

/** How a player handles a gun. */
export interface Hand {
  /** How far a shot lands from where the player means it, per axis, in radians. */
  shake: number;
  /** Seconds to swing onto a new target. */
  acquire: number;
  /** How far off the gun may still be from its kick, in metres at the target, before they fire again. */
  patience: number;
  /** Goes for the head rather than the neck. */
  head: boolean;
}

export const STEADY: Hand = { shake: 0.005, acquire: 0.45, patience: 0.15, head: true };
export const AVERAGE: Hand = { shake: 0.009, acquire: 0.6, patience: 0.3, head: false };
/** Sprays with the trigger held down and never waits for the gun to settle. */
export const SLOPPY: Hand = { shake: 0.018, acquire: 0.8, patience: Infinity, head: false };

export interface Bot {
  seat: Seat;
  weapon: WeaponId;
  hand: Hand;
}

const DT = 1 / 30;
/** A zombie this close, in metres, pulls a bot's aim off whatever it was shooting. */
const CLOSE = 7;

export interface StageResult {
  stage: number;
  cleared: boolean;
  healthLost: number;
  /** Health at the end, with the checkpoint's supplies if the stage was cleared. */
  health: number;
  seconds: number;
}

/** A normal random number, for the shake of a hand. */
function gauss(rng: Rng): number {
  return Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());
}

/**
 * The zombie a bot shoots at. A team spreads its fire the way people do:
 * the second player takes the second closest, and so on, doubling up
 * once there are not enough to go round.
 */
function targetFor(game: SurvivalGame, rank: number): Zombie | undefined {
  const standing = game.encounter?.zombies.filter(alive).sort((a, b) => a.ahead - b.ahead) ?? [];
  return standing[rank % Math.max(1, standing.length)];
}

/** A player who knows their gun lets the dead come into its reach before firing. A boss is a bigger target. */
function inReach(weapon: WeaponId, z: Zombie): boolean {
  return z.ahead < reach(WEAPONS[weapon]) * (isBoss(z.kind) ? 3 : 2.5);
}

/** Plays one stage's fight from its start with the given health. */
export function simulateStage(stage: number, bots: readonly Bot[], health: number, seed = 1, level: BotLevel = "easy"): StageResult {
  const rng = new Rng(seed * 101 + stage);
  const game = new SurvivalGame(() => rng.next(), level);
  game.start(bots.map((b) => ({ seat: b.seat, weapon: b.weapon })), stage);
  while (game.phase === "travel") game.update(0.5);
  game.health = health;
  const aiming = new Map<Seat, { target: number; ready: number }>();
  let lowest = health;
  let t = 0;
  while (game.phase === "fight" && t < 400) {
    t += DT;
    for (const [rank, bot] of bots.entries()) {
      const aim = aiming.get(bot.seat);
      // Like a person, a bot stays on the one it is aiming at until it drops, unless another gets too close.
      const held = aim && game.encounter?.find(aim.target);
      const next = targetFor(game, rank);
      const threat = next && held && next.ahead < CLOSE && next.ahead < held.ahead - 2;
      const target = held && alive(held) && !threat ? held : next;
      if (!target) continue;
      if (!aim || aim.target !== target.id) {
        aiming.set(bot.seat, { target: target.id, ready: t + bot.hand.acquire * (0.8 + rng.next() * 0.4) });
        continue;
      }
      const gun = game.squad.get(bot.seat)!.gun;
      if (t < aim.ready || !inReach(bot.weapon, target)) continue;
      if (gun.recoil.size * target.ahead > bot.hand.patience) continue;
      const point = aimPoint(target, bot.hand.head);
      const shake = { x: gauss(rng) * bot.hand.shake, y: gauss(rng) * bot.hand.shake };
      const zombies = game.encounter?.zombies ?? [];
      const cast: CastFn = (offsets) => offsets.map((o) => traceShot(zombies, { x: point.x + shake.x + o.x, y: point.y + shake.y + o.y }));
      game.fire(bot.seat, cast);
    }
    game.update(DT);
    lowest = Math.min(lowest, game.health);
  }
  return { stage, cleared: game.phase !== "down" && game.phase !== "fight", healthLost: health - lowest, health: game.health, seconds: t };
}

/** Plays the whole route from a stage, healing at checkpoints as the game does. Returns where it ended. */
export function simulateRun(bots: readonly Bot[], opts: { from?: number; to?: number; seed?: number; level?: BotLevel } = {}): { reached: number; results: StageResult[] } {
  const { from = 1, to = STAGE_COUNT, seed = 1, level = "easy" } = opts;
  let health = MAX_HEALTH;
  const results: StageResult[] = [];
  for (let stage = from; stage <= to; stage++) {
    const result = simulateStage(stage, bots, health, seed, level);
    results.push(result);
    if (!result.cleared) return { reached: stage, results };
    health = result.health;
  }
  return { reached: to + 1, results };
}
