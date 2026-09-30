import type { BrainWorld } from "./brain";
import type { Fighter } from "./fighter";
import { pathBlocked } from "./geometry";
import { routesFrom, routeTo } from "./path";
import { BODY } from "./tuning";
import { dirOf, dist, type V2 } from "./vec";

/** A run must gain at least this much ground the way asked, metres, so a step is never a shuffle round the same bunker. */
const MIN_GAIN = 1.5;
/** Gains past this count no more, so the next cover wins over the longest sprint. */
const GAIN_CAP = 6;
/** How much drifting sideways costs against ground gained. */
const SIDEWAYS = 0.6;
/** How much the way round a bunker costs beyond the straight line, per metre. */
const DETOUR = 0.5;
/** The furthest along the runs a single press looks for its next spot, metres. */
const REACH = 12;
/** A spot on another bunker is worth this many metres more: it is a new position, not the same one. */
const NEW_COVER = 2;
/** A spot this close to someone else is taken. */
const TAKEN = 1.3;
/** Closer than this to a spot counts as there. */
const AT_SPOT = 0.2;

/** Steps toward a point. Returns true once there. */
export function walk(f: Fighter, to: V2, step: number): boolean {
  const d = dist(f.pos, to);
  if (d <= step || d < 1e-6) {
    f.pos = { ...to };
    return true;
  }
  f.pos = { x: f.pos.x + ((to.x - f.pos.x) / d) * step, z: f.pos.z + ((to.z - f.pos.z) / d) * step };
  return false;
}

/**
 * A player's own movement. Holding ADVANCE runs them along the cover
 * graph to the next spot ahead (the way their view faces), and on to the
 * one after while it is held; RETREAT does the same backwards. Letting go
 * stops them where they are, even partway along a run. The runs, spots
 * and speed are the ones the computer players use.
 */
export function steer(f: Fighter, w: BrainWorld, step: number): void {
  const b = f.brain;
  if (f.move === 0) {
    if (b.stance === "move") stop(f, w);
    return;
  }
  if ((b.stance !== "move" || b.heading !== f.move) && !setOff(f, w, f.move)) return;
  const next = b.route[0]!;
  if (!walk(f, w.graph.spots[next]!.pos, step)) return;
  b.route.shift();
  b.last = next;
  if (b.route.length > 0) return;
  // At the spot: carry straight on to the next one while the button is held.
  b.stance = "hide";
  b.timer = 0.25;
  setOff(f, w, f.move);
}

/** Holds where the player let go: at the spot if they reached it, otherwise out on the run, which a new press picks up. */
function stop(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  const there = dist(f.pos, w.graph.spots[b.spot]!.pos) < AT_SPOT;
  b.stance = "hide";
  b.timer = 0.25;
  b.anchor = there ? null : { ...f.pos };
  if (there) b.route = [];
}

/** Starts a run the way asked. False when there is nowhere to go that way, and the player holds. */
function setOff(f: Fighter, w: BrainWorld, dir: 1 | -1): boolean {
  const b = f.brain;
  if (b.anchor !== null || b.stance === "move") {
    // Partway along a run: carry on along it, or turn straight back to the spot just passed.
    if (dir !== b.heading) {
      const ahead = b.route[0] ?? b.spot;
      b.route = [b.last];
      b.spot = b.last;
      b.last = ahead;
    }
  } else {
    const plan = nextSpot(f, w, dir);
    if (plan === null) return false;
    // Out from a peek round a wall, step back behind it before running on.
    const out = dist(f.pos, w.graph.spots[b.spot]!.pos) > AT_SPOT;
    const cut = out && pathBlocked(f.pos, w.graph.spots[plan.route[0]!]!.pos, w.pieces, BODY.radius);
    b.route = cut ? [b.spot, ...plan.route] : plan.route;
    b.last = b.spot;
    b.spot = plan.spot;
  }
  b.heading = dir;
  b.stance = "move";
  b.anchor = null;
  b.peekAt = null;
  b.held = 0;
  return true;
}

/**
 * The next position the way asked: the best spot within a short run that
 * gains real ground that way, and the route there along the cover graph,
 * or null if there is none. Near spots on new cover win; going round a
 * bunker is fine, a long detour is not.
 */
export function nextSpot(f: Fighter, w: BrainWorld, dir: 1 | -1): { spot: number; route: number[] } | null {
  const here = w.graph.spots[f.brain.spot]!;
  const ahead = dirOf(f.look);
  const routes = routesFrom(w.graph, here.id);
  let best = -1;
  let bestScore = -Infinity;
  for (const s of w.graph.spots) {
    const cost = routes.cost[s.id]!;
    if (!(cost <= REACH)) continue;
    const dx = s.pos.x - here.pos.x;
    const dz = s.pos.z - here.pos.z;
    const gain = (dx * ahead.x + dz * ahead.z) * dir;
    const side = Math.abs(dx * ahead.z - dz * ahead.x);
    if (gain < MIN_GAIN || side > gain * 1.5 + 1) continue;
    if (w.others.some((o) => dist(o, s.pos) < TAKEN)) continue;
    const detour = cost - Math.hypot(dx, dz);
    const cover = s.piece >= 0 && s.piece !== here.piece ? NEW_COVER : 0;
    const score = Math.min(gain, GAIN_CAP) - side * SIDEWAYS - detour * DETOUR - cost * 0.1 + cover;
    if (score > bestScore) {
      bestScore = score;
      best = s.id;
    }
  }
  const route = best < 0 ? null : routeTo(routes, best);
  return route && route.length > 0 ? { spot: best, route } : null;
}
