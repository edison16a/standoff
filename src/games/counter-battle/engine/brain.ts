import type { Piece } from "./arena";
import type { CoverGraph } from "./cover";
import type { Fighter } from "./fighter";
import { duckDown, nearest, startPeek } from "./peek";
import { chooseSpot } from "./plan";
import type { Rng } from "./rng";
import { steer, walk } from "./steer";
import { STYLES } from "./tactics";
import { PLAN_EVERY } from "./tuning";
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
  /** Multiplier on running speed, below 1 for easier computer players. */
  pace: number;
  /** A player steering with ADVANCE and RETREAT, who only goes low when they hold Crouch. */
  steer: boolean;
}

/** Longest a peek can be stretched by a fighter who keeps shooting. */
const MAX_OUT = 4;
/** How fast the body turns toward the fight, radians per second. */
const TURN = 6;
/** How fast a fighter drops into or rises from a crouch, per second. Slow enough to read as a real duck. */
const CROUCH_RATE = 5;
/** A peek cut short by a hit ducks back after this long, so hits matter. */
const FLINCH = 0.18;
/** Holding Crouch keeps a player at their spot this long before the brain moves them on anyway. */
const MAX_DOWN = 5;
/** Moving between spots is a crouched jog, not a sprint: part of the gun's full speed. */
const JOG = 0.85;
/** A player holding Crouch on the move goes at this share of the jog. */
const CRAWL = 0.55;

/**
 * The movement brain every fighter runs. For the computer it runs cover
 * to cover along the cover graph, hides, rises to peek, picks new cover
 * as the fight moves and ducks to reload. A player picks where to go with
 * ADVANCE and RETREAT (`steer.ts`) and only goes low while holding
 * Crouch, on the move too. A shot or letting go of Crouch brings them up.
 */
export function updateBrain(f: Fighter, w: BrainWorld, now: number, dt: number): void {
  const b = f.brain;
  const style = STYLES[f.gun.id];
  const spots = w.graph.spots;
  // Players only go low when they hold Crouch; the computer also ducks to reload.
  const ducking = f.duck || (!w.steer && f.gun.reloading && b.stance !== "move");
  b.down = f.duck && b.stance !== "move" ? b.down + dt : 0;
  b.sincePlan += dt;
  if (b.stance !== "move") b.held += dt;
  const hurt = now - f.hitAt < dt * 1.5;
  const holding = f.duck && b.down < MAX_DOWN;
  const due = !w.steer && b.stance !== "move" && !holding && (b.sincePlan >= PLAN_EVERY || (hurt && b.stance === "hide"));
  if (due) replan(f, w);

  const from = { ...f.pos };
  const speed = f.gun.spec.speed * w.pace;
  // A step that starts on the run only runs, as it always has, so the computer's timing never shifts.
  const running = b.stance === "move";
  if (w.steer) steer(f, w, speed * JOG * (f.duck ? CRAWL : 1) * dt);
  else if (running) runRoute(f, w, speed * JOG * dt, hurt);
  if (!running && b.stance === "hide") {
    walk(f, b.anchor ?? spots[b.spot]!.pos, speed * 0.6 * dt);
    b.timer -= dt;
    if (ducking) b.timer = Math.max(b.timer, 0.25);
    else if (f.rise) b.timer = 0;
    // A player stays put until they shoot; only the computer looks out on its own.
    else if (w.steer) b.timer = Math.max(b.timer, 0.25);
    if (b.timer <= 0) startPeek(f, w);
  } else if (!running && b.stance === "peek") {
    walk(f, b.peekAt ?? b.anchor ?? spots[b.spot]!.pos, speed * 0.6 * dt);
    b.timer -= dt;
    b.out += dt;
    if ((w.engaged || f.rise) && b.timer < 0.5 && b.out < MAX_OUT) b.timer = 0.5;
    if (hurt) b.timer = Math.min(b.timer, FLINCH);
    if (ducking) duckDown(f, w);
    else if (b.timer <= 0) {
      b.stance = "hide";
      b.timer = w.rng.range(...style.hide);
    }
  }
  f.rise = false;
  f.vel = { x: (f.pos.x - from.x) / dt, z: (f.pos.z - from.z) / dt };
  f.pose = poseOf(f, w, ducking);
  const low = f.pose === "crouch" ? 1 : 0;
  f.crouch += Math.sign(low - f.crouch) * Math.min(Math.abs(low - f.crouch), CROUCH_RATE * dt);
  face(f, w, dt);
}

function poseOf(f: Fighter, w: BrainWorld, ducking: boolean): Fighter["pose"] {
  const b = f.brain;
  if (b.stance === "move") {
    if (f.duck) return "crouch";
    return len(f.vel) > 0.3 ? "run" : "stand";
  }
  if (b.stance === "peek") return "peek";
  // The computer kneels behind low cover by itself; a player only when they hold Crouch.
  if (ducking) return "crouch";
  return w.steer || w.graph.spots[b.spot]!.tall ? "stand" : "crouch";
}

/** The computer's run along its planned route, re-planning at each spot on the way. */
function runRoute(f: Fighter, w: BrainWorld, step: number, hurt: boolean): void {
  const b = f.brain;
  const next = b.route[0];
  if (next === undefined) return arrive(f, w);
  if (!walk(f, w.graph.spots[next]!.pos, step)) return;
  b.last = next;
  b.route.shift();
  if (b.route.length === 0) arrive(f, w);
  // Each spot on the way is a chance to change plan as the fight moves.
  else if (b.sincePlan >= PLAN_EVERY || hurt) replan(f, w);
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
  b.anchor = null;
}

function arrive(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  b.stance = "hide";
  b.held = 0;
  // Settle in behind the new cover for a moment before the first look.
  b.timer = w.rng.range(0.5, STYLES[f.gun.id].hide[0]);
}

/** Turns the body and camera toward the nearest enemy, smoothly. */
function face(f: Fighter, w: BrainWorld, dt: number): void {
  const target = nearest(f.pos, w.enemies);
  if (!target) return;
  const want = yawOf({ x: target.pos.x - f.pos.x, z: target.pos.z - f.pos.z });
  const d = turnTo(f.look, want);
  f.look += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
}
