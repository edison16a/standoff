import type { BrainWorld } from "./brain";
import { hiddenFrom, type Spot } from "./cover";
import type { Fighter } from "./fighter";
import { routesFrom, routeTo } from "./path";
import { canPeek } from "./plan";
import { engageRange, STYLES } from "./tactics";
import { BODY } from "./tuning";
import { dist, turnTo, type V2 } from "./vec";

/** The next stretch of a fighter's skirmish: the spot to run to and the route there along the cover graph. */
export interface Hop {
  spot: number;
  route: number[];
  /** Metres gained round the other team the way the fighter circles; negative went the other way. */
  arc: number;
  /** The fighter was already at its range when it picked, so it is circling rather than closing in. */
  inRange: boolean;
}

/** Hops are runs of this length along the graph, metres: long enough to change the angle, short enough to stay in touch. */
export const MIN_HOP = 2.5;
export const MAX_HOP = 11;
/** The hop length that suits best. */
const IDEAL_HOP = 6;
/** Score per metre circled the right way round, capped so circling never beats holding the range. */
const CIRCLE = 0.3;
const MAX_ARC = 5;
/** Seeing an enemy from the spot, by standing or stepping out: a chance to shoot, for both sides. */
const SIGHT = 1;
/** Cover from the nearest enemy, worth more while backing off or still closing in. */
const COVER = 0.5;
const COVER_SAFE = 1.2;
/** How much holding the range counts, per band off it. */
const RANGE = 1.4;
/** Teammates closer than this crowd each other. */
const SPREAD = 8;
/** A spot this close to anyone else is taken. */
const TAKEN = 1.3;
/** Nearer than this to an enemy is charging in. */
const TOO_CLOSE = 3.5;

/** The middle of the other team, which a fighter circles. */
export function centreOf(enemies: readonly Fighter[]): V2 {
  let x = 0;
  let z = 0;
  for (const e of enemies) {
    x += e.pos.x;
    z += e.pos.z;
  }
  return { x: x / enemies.length, z: z / enemies.length };
}

function nearestDistance(p: V2, enemies: readonly Fighter[]): number {
  let near = Infinity;
  for (const e of enemies) near = Math.min(near, dist(p, e.pos));
  return near;
}

/** The bearing of `p` seen from `c`, as a yaw. */
const bearing = (c: V2, p: V2): number => Math.atan2(p.x - c.x, p.z - c.z);

/**
 * Picks the next hop for a fighter standing at spot `here`. Spots a short
 * run away are scored on holding the gun's range to the nearest enemy,
 * moving round the other team the way the fighter circles, a line to
 * shoot along, cover, room from teammates and a hop of a good length.
 * Null when every spot in reach is taken.
 */
export function pickHop(f: Fighter, w: BrainWorld, here: number, backing: boolean): Hop | null {
  const spots = w.graph.spots;
  const style = STYLES[f.gun.id];
  const want = engageRange(style, w.pressure, backing);
  const band = style.engage[1];
  const centre = centreOf(w.enemies);
  const start = spots[here]!.pos;
  const from = bearing(centre, start);
  const r0 = dist(start, centre);
  const inRange = Math.abs(nearestDistance(start, w.enemies) - want) <= band;
  const routes = routesFrom(w.graph, here);
  const crowd = [...w.mates, ...w.claimed];
  let best: Hop | null = null;
  let bestScore = -Infinity;
  for (const s of spots) {
    const cost = routes.cost[s.id]!;
    if (!(cost >= MIN_HOP && cost <= MAX_HOP)) continue;
    if (w.others.some((o) => dist(o, s.pos) < TAKEN)) continue;
    const arc = turnTo(from, bearing(centre, s.pos)) * f.brain.orbit * ((r0 + dist(s.pos, centre)) / 2);
    const score = scoreSpot(s, w, { want, band, backing, crowd }) + CIRCLE * Math.min(MAX_ARC, arc) - (Math.abs(cost - IDEAL_HOP) / IDEAL_HOP) * 0.6 - (s.id === f.brain.from ? 1.5 : 0) + w.rng.range(0, 0.3);
    if (score > bestScore) {
      bestScore = score;
      best = { spot: s.id, route: [], arc, inRange };
    }
  }
  if (!best) return null;
  best.route = routeTo(routes, best.spot) ?? [];
  return best.route.length > 0 ? best : null;
}

interface Wants {
  want: number;
  band: number;
  backing: boolean;
  /** Where teammates stand and are heading. */
  crowd: readonly V2[];
}

/** How good a spot is to fight from, before the circling and the run there. */
export function scoreSpot(s: Spot, w: BrainWorld, x: Wants): number {
  let near = Infinity;
  let closest: Fighter | null = null;
  for (const e of w.enemies) {
    const d = dist(s.pos, e.pos);
    if (d < near) {
      near = d;
      closest = e;
    }
  }
  let score = (-RANGE * Math.abs(near - x.want)) / x.band;
  if (near < TOO_CLOSE) score -= 3;
  // Still closing in, a fighter moves up behind cover; in range, a line to shoot along counts.
  const safe = x.backing || near > x.want + x.band;
  if (!safe && w.enemies.some((e) => canPeek(s, e.pos, w.pieces))) score += SIGHT;
  if (closest && hiddenFrom(s.pos, !s.tall, { x: closest.pos.x, y: BODY.standEye, z: closest.pos.z }, w.pieces)) score += safe ? COVER_SAFE : COVER;
  for (const m of x.crowd) {
    const d = dist(s.pos, m);
    if (d < SPREAD) score -= ((SPREAD - d) / SPREAD) * 3;
  }
  return score;
}
