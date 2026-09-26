import type { Piece } from "./arena";
import { hiddenFrom, type CoverGraph, type Spot } from "./cover";
import type { Fighter } from "./fighter";
import { sightBlocked } from "./geometry";
import { routesFrom, routeTo } from "./path";
import type { Rng } from "./rng";
import { STYLES, wantedRange } from "./tactics";
import { BODY } from "./tuning";
import { dist, type V2, type V3 } from "./vec";

export interface PlanInput {
  f: Fighter;
  /** Living enemies. There is always at least one while a round runs. */
  enemies: readonly Fighter[];
  /** Where each living teammate is or is heading, so the team spreads out. */
  claimed: readonly V2[];
  /** Where every other living fighter stands, so two never share a spot. */
  others: readonly V2[];
  graph: CoverGraph;
  pieces: readonly Piece[];
  pressure: number;
  rng: Rng;
}

export interface Plan {
  spot: number;
  route: number[];
}

/** Teammates closer than this crowd each other. */
const SPREAD = 7.5;
/** Runs the enemy can see cost this much more per metre. */
const EXPOSED_RUN = 0.9;

const standEye = (p: V2): V3 => ({ x: p.x, y: BODY.standEye, z: p.z });
const chest = (p: V2, crouched: boolean): V3 => ({ x: p.x, y: (crouched ? BODY.crouchTop : BODY.standTop) * 0.7, z: p.z });

/** Whether someone at the spot can get a look at the enemy by standing up or stepping out. */
export function canPeek(spot: Spot, enemy: V2, pieces: readonly Piece[]): boolean {
  const target = chest(enemy, false);
  return peekPoints(spot, enemy).some((p) => !sightBlocked(standEye(p), target, pieces));
}

/** Where a fighter can look out from a spot toward `toward`: up in place, then a step either side. */
export function peekPoints(spot: Spot, toward: V2): V2[] {
  const dx = toward.x - spot.pos.x;
  const dz = toward.z - spot.pos.z;
  const l = Math.hypot(dx, dz) || 1;
  const side = { x: -dz / l, z: dx / l };
  const step = 0.85;
  const out = [
    { x: spot.pos.x + side.x * step, z: spot.pos.z + side.z * step },
    { x: spot.pos.x - side.x * step, z: spot.pos.z - side.z * step },
  ];
  return spot.tall ? out : [spot.pos, ...out];
}

/**
 * Picks the spot a fighter should head for and the route there. Each
 * spot is scored on the range the gun wants, cover from the enemy, a
 * chance to shoot from it, how far it is, how close teammates are, and
 * how long the fighter has sat still. Pressure shrinks the range and the
 * value of hiding as a round goes on.
 */
export function chooseSpot(input: PlanInput): Plan {
  const { f, enemies, graph, pieces, pressure, rng } = input;
  const style = STYLES[f.gun.id];
  const b = f.brain;
  const start = b.stance === "move" ? (b.route[0] ?? b.spot) : b.spot;
  const eyes = enemies.map((e) => standEye(e.pos));
  const exposedRuns = new Map<number, number>();
  const routes = routesFrom(graph, start, (u, v) => {
    const key = u < v ? u * 4096 + v : v * 4096 + u;
    let extra = exposedRuns.get(key);
    if (extra === undefined) {
      const a = graph.spots[u]!.pos;
      const c = graph.spots[v]!.pos;
      const mid = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 };
      const seen = eyes.some((eye) => !sightBlocked(eye, chest(mid, false), pieces));
      extra = seen ? dist(a, c) * EXPOSED_RUN : 0;
      exposedRuns.set(key, extra);
    }
    return extra;
  });
  const want = wantedRange(style, pressure);
  const reach = 22 + pressure * 14;
  let best = b.spot;
  let bestScore = -Infinity;
  for (const spot of graph.spots) {
    const cost = routes.cost[spot.id]!;
    if (!(cost <= reach) && spot.id !== b.spot) continue;
    const s = scoreSpot(spot, cost, input, want, eyes) + rng.range(0, 0.25);
    if (s > bestScore) {
      bestScore = s;
      best = spot.id;
    }
  }
  if (best === start) return { spot: best, route: start === b.spot ? [] : [start] };
  const route = routeTo(routes, best) ?? [];
  // A fighter partway along a run finishes it before turning off.
  if (start !== b.spot || b.stance === "move") route.unshift(start);
  return { spot: best, route: dedupe(route) };
}

function dedupe(route: number[]): number[] {
  return route.filter((id, i) => i === 0 || route[i - 1] !== id);
}

function scoreSpot(spot: Spot, cost: number, input: PlanInput, want: number, eyes: readonly V3[]): number {
  const { f, enemies, pieces, pressure } = input;
  const style = STYLES[f.gun.id];
  let near = Infinity;
  for (const e of enemies) near = Math.min(near, dist(spot.pos, e.pos));
  let score = -Math.abs(near - want) / style.band;
  // Cover only counts against enemies close enough to matter.
  let hidden = 0;
  let flanked = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (hiddenFrom(spot.pos, !spot.tall, eyes[i]!, pieces)) hidden += 1;
    // Seeing a crouched enemy from here means their cover does not cover them.
    if (!sightBlocked(standEye(spot.pos), chest(enemies[i]!.pos, true), pieces)) flanked += 1;
  }
  score += style.safety * (hidden / enemies.length) * (1 - 0.5 * pressure);
  score += style.flank * (flanked / enemies.length);
  if (enemies.some((e) => canPeek(spot, e.pos, pieces))) score += 1.1;
  score -= Number.isFinite(cost) ? cost / 14 : 3;
  for (const a of input.claimed) {
    const d = dist(spot.pos, a);
    if (d < SPREAD) score -= ((SPREAD - d) / SPREAD) * 1.7;
  }
  if (input.others.some((o) => dist(spot.pos, o) < 1.3)) score -= 4;
  if (spot.id === f.brain.spot) score += 0.7 - style.restless * f.brain.held;
  else if (dist(spot.pos, input.graph.spots[f.brain.spot]!.pos) < 2.5) score -= 0.5;
  // Closing in: as pressure builds, nearer spots win outright.
  score -= (pressure * near) / 12;
  return score;
}
