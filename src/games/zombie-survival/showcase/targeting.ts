import type { Seat } from "@/platform/protocol";
import type { TargetPoint } from "../render/scene-source";
import type { BotRole } from "./bot";

/** One computer player as the planner sees it: its seat, its side of the screen and what it held last. */
export interface Shooter {
  seat: Seat;
  role: BotRole;
  /** The middle of this player's patch of screen, in clip space x. */
  lane: number;
  /** The zombie it aimed at last frame, if any. */
  held: number | null;
}

/** Only this many zombies, the nearest, are weighed, which keeps the search small. */
const CONSIDER = 6;
/** Sharing a zombie costs more than any spread or distance could, so it happens only when there are too few. */
const SHARED = 100;
/** How much straying from its own side costs a player, per unit of clip space. */
const LANE = 2;
/** Keeping the same zombie is cheaper than moving, so aims do not flick between two close choices. */
const STICK = 0.25;
/** A boss player leans towards the boss. */
const BOSS_PULL = 0.3;
/** Zombies this close, in metres, jump the queue. */
const TOO_CLOSE = 7;
/** A point of another zombie this near the aim, in clip space, and nearer the camera, blocks the shot. */
const BLOCK = 0.06;

export const onScreen = (t: TargetPoint) => Math.abs(t.x) < 0.92 && Math.abs(t.y) < 0.9;

/** Each player's patch of screen, spread evenly from left to right. */
export function lanes(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (count > 1 ? -0.6 + (1.2 * i) / (count - 1) : 0));
}

interface Candidate {
  id: number;
  points: TargetPoint[];
  boss: boolean;
  x: number;
  distance: number;
}

function candidates(targets: readonly TargetPoint[]): Candidate[] {
  const byZombie = new Map<number, TargetPoint[]>();
  for (const t of targets) if (onScreen(t)) byZombie.set(t.zombie, [...(byZombie.get(t.zombie) ?? []), t]);
  return [...byZombie.entries()]
    .map(([id, points]) => {
      const boss = points.some((p) => p.part === "weak");
      const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      return { id, points, boss, x, distance: Math.min(...points.map((p) => p.distance)) };
    })
    .sort((a, b) => a.distance - b.distance || a.id - b.id)
    .slice(0, CONSIDER);
}

function cost(shooter: Shooter, zombie: Candidate): number {
  let c = LANE * Math.abs(zombie.x - shooter.lane) + zombie.distance / 20;
  if (zombie.distance < TOO_CLOSE) c -= 0.5;
  if (shooter.held === zombie.id) c -= STICK;
  if (shooter.role === "boss" && zombie.boss) c -= BOSS_PULL;
  return c;
}

/** The point to hold on a zombie: a boss's joints turn about between players, anything else is shot in the head. */
function pointOn(zombie: Candidate, seat: Seat, time: number): TargetPoint {
  const joints = zombie.points.filter((p) => p.part === "weak").sort((a, b) => (a.weak ?? 0) - (b.weak ?? 0));
  if (joints.length) return joints[(seat + Math.floor(time / 2.6)) % joints.length]!;
  return zombie.points.find((p) => p.part === "head") ?? zombie.points[0]!;
}

/**
 * Gives every player a zombie of its own. Every way of pairing players
 * with the nearest zombies is tried, and the cheapest wins: each player
 * keeps to its side of the screen, near zombies go first, and two
 * players share a zombie only when there are not enough to go round.
 * The search is small and has no chance in it, so it replays exactly.
 */
export function assignTargets(shooters: readonly Shooter[], targets: readonly TargetPoint[], time: number): Map<Seat, TargetPoint> {
  const pool = candidates(targets);
  const picks = new Map<Seat, TargetPoint>();
  if (!pool.length) return picks;
  let best: number[] = [];
  let bestCost = Infinity;
  const chosen: number[] = [];
  const search = (i: number, sum: number) => {
    if (sum >= bestCost) return;
    if (i === shooters.length) {
      bestCost = sum;
      best = [...chosen];
      return;
    }
    for (let z = 0; z < pool.length; z++) {
      const shared = chosen.includes(z) ? SHARED : 0;
      chosen.push(z);
      search(i + 1, sum + shared + cost(shooters[i]!, pool[z]!));
      chosen.pop();
    }
  };
  search(0, 0);
  best.forEach((z, i) => picks.set(shooters[i]!.seat, pointOn(pool[z]!, shooters[i]!.seat, time)));
  return picks;
}

/** Whether a shot at `target` from `aim` would meet another zombie first. */
export function blocked(target: TargetPoint, aim: { x: number; y: number }, targets: readonly TargetPoint[]): boolean {
  return targets.some((t) => t.zombie !== target.zombie && t.distance < target.distance && Math.hypot(t.x - aim.x, t.y - aim.y) < BLOCK);
}
