import type { Piece } from "./arena";
import type { CoverGraph } from "./cover";
import type { Fighter } from "./fighter";
import { pathBlocked, sightBlocked } from "./geometry";
import { canPeek, chooseSpot, peekPoints } from "./plan";
import type { Rng } from "./rng";
import { STYLES } from "./tactics";
import { BODY, PLAN_EVERY } from "./tuning";
import { dist, len, turnTo, yawOf, type V2 } from "./vec";

export interface BrainWorld {
  graph: CoverGraph;
  pieces: readonly Piece[];
  enemies: readonly Fighter[];
  claimed: readonly V2[];
  others: readonly V2[];
  pressure: number;
  rng: Rng;
  /** True while the fighter is trading fire, which holds a peek open a little longer. */
  engaged: boolean;
}

/** Longest a peek can be stretched by a fighter who keeps shooting. */
const MAX_OUT = 4;
/** How fast the body turns toward the fight, radians per second. */
const TURN = 6;
/** How fast a fighter drops into or rises from a crouch, per second. */
const CROUCH_RATE = 7;
/** A peek cut short by a hit ducks back after this long, so hits matter. */
const FLINCH = 0.18;

/**
 * The movement brain every fighter runs, human or computer. Players never
 * steer: the brain runs cover to cover along the cover graph, hides,
 * peeks, and picks new cover as the fight moves. Humans only aim and
 * shoot, and their shooting holds a peek open.
 */
export function updateBrain(f: Fighter, w: BrainWorld, now: number, dt: number): void {
  const b = f.brain;
  const style = STYLES[f.gun.id];
  const spots = w.graph.spots;
  b.sincePlan += dt;
  if (b.stance !== "move") b.held += dt;
  const hurt = now - f.hitAt < dt * 1.5;
  const due = b.stance !== "move" && (b.sincePlan >= PLAN_EVERY || (hurt && b.stance === "hide"));
  if (due) replan(f, w);

  const from = { ...f.pos };
  if (b.stance === "move") {
    const next = b.route[0];
    if (next === undefined) arrive(f, w);
    else if (walk(f, spots[next]!.pos, f.gun.spec.speed * dt)) {
      b.route.shift();
      if (b.route.length === 0) arrive(f, w);
      // Each spot on the way is a chance to change plan as the fight moves.
      else if (b.sincePlan >= PLAN_EVERY || hurt) replan(f, w);
    }
  } else if (b.stance === "hide") {
    walk(f, spots[b.spot]!.pos, f.gun.spec.speed * 0.6 * dt);
    b.timer -= dt;
    if (b.timer <= 0) startPeek(f, w);
  } else {
    walk(f, b.peekAt ?? spots[b.spot]!.pos, f.gun.spec.speed * 0.6 * dt);
    b.timer -= dt;
    b.out += dt;
    if (w.engaged && b.timer < 0.3 && b.out < MAX_OUT) b.timer = 0.3;
    if (hurt) b.timer = Math.min(b.timer, FLINCH);
    if (b.timer <= 0) {
      b.stance = "hide";
      b.timer = w.rng.range(...style.hide);
    }
  }
  f.vel = { x: (f.pos.x - from.x) / dt, z: (f.pos.z - from.z) / dt };
  f.pose = poseOf(f, w);
  const low = f.pose === "crouch" ? 1 : 0;
  f.crouch += Math.sign(low - f.crouch) * Math.min(Math.abs(low - f.crouch), CROUCH_RATE * dt);
  face(f, w, dt);
}

function poseOf(f: Fighter, w: BrainWorld): Fighter["pose"] {
  const b = f.brain;
  if (b.stance === "move") return len(f.vel) > 0.3 ? "run" : "stand";
  if (b.stance === "peek") return "peek";
  return w.graph.spots[b.spot]!.tall ? "stand" : "crouch";
}

function replan(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  b.sincePlan = 0;
  const plan = chooseSpot({ f, enemies: w.enemies, claimed: w.claimed, others: w.others, graph: w.graph, pieces: w.pieces, pressure: w.pressure, rng: w.rng });
  if (plan.spot === b.spot && b.stance !== "move") return;
  const route = [...plan.route];
  // Leaving from a peek, step back to the spot first so the run is a clear one.
  const at = w.graph.spots[b.spot]!.pos;
  if (b.stance !== "move" && dist(f.pos, at) > 0.2) route.unshift(b.spot);
  b.route = route;
  if (plan.spot !== b.spot) b.held = 0;
  b.spot = plan.spot;
  b.stance = "move";
  b.peekAt = null;
}

function arrive(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  b.stance = "hide";
  b.held = 0;
  // Arriving shooters look out soon: a spot is taken to fight from.
  b.timer = w.rng.range(0.2, STYLES[f.gun.id].hide[0]);
}

function startPeek(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  const spot = w.graph.spots[b.spot]!;
  const target = nearest(f.pos, w.enemies);
  b.stance = "peek";
  b.out = 0;
  b.timer = w.rng.range(...STYLES[f.gun.id].peek);
  b.peekAt = null;
  if (!target) return;
  // Out of this gun's reach a look is only a glance, and the spot gets old fast, so the fighter moves up.
  if (dist(f.pos, target.pos) > STYLES[f.gun.id].range + STYLES[f.gun.id].band * 1.5) {
    b.timer = Math.min(b.timer, 0.45);
    b.held += 1.5;
  }
  const eye = (p: V2) => ({ x: p.x, y: BODY.standEye, z: p.z });
  const chest = { x: target.pos.x, y: BODY.standTop * 0.7, z: target.pos.z };
  const options = peekPoints(spot, target.pos).filter((p) => p === spot.pos || !pathBlocked(spot.pos, p, w.pieces, BODY.radius));
  const clear = options.find((p) => !sightBlocked(eye(p), chest, w.pieces));
  const pick = clear ?? options[0] ?? spot.pos;
  b.peekAt = pick === spot.pos ? null : pick;
  // Nothing to see from here at all: this spot is done, look for a better one.
  if (!clear && !canPeek(spot, target.pos, w.pieces)) b.held += 3;
}

/** Steps toward a point. Returns true once there. */
function walk(f: Fighter, to: V2, step: number): boolean {
  const d = dist(f.pos, to);
  if (d <= step || d < 1e-6) {
    f.pos = { ...to };
    return true;
  }
  f.pos = { x: f.pos.x + ((to.x - f.pos.x) / d) * step, z: f.pos.z + ((to.z - f.pos.z) / d) * step };
  return false;
}

function nearest(p: V2, fighters: readonly Fighter[]): Fighter | null {
  let best: Fighter | null = null;
  for (const o of fighters) if (!best || dist(p, o.pos) < dist(p, best.pos)) best = o;
  return best;
}

/** Turns the body and camera toward the nearest enemy, smoothly. */
function face(f: Fighter, w: BrainWorld, dt: number): void {
  const target = nearest(f.pos, w.enemies);
  if (!target) return;
  const want = yawOf({ x: target.pos.x - f.pos.x, z: target.pos.z - f.pos.z });
  const d = turnTo(f.look, want);
  f.look += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
}
