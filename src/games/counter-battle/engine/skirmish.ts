import { easeCrouch, FLINCH, JOG, TURN, walk, type BrainWorld } from "./brain";
import { pickHop } from "./engage";
import type { Fighter } from "./fighter";
import { pathBlocked } from "./geometry";
import { nearest, startPeek } from "./peek";
import { BODY, PLAN_EVERY } from "./tuning";
import { dist, len, turnTo, yawOf } from "./vec";

/** Seconds a fighter pauses at each spot before the next hop: long enough to aim, short enough to never stand still. */
const PAUSE: [number, number] = [0.25, 0.8];
/** The longest look out from behind a wall, even while shooting, before moving on. */
const MAX_PEEK = 1.8;
/** Below this health a fighter backs off a little. */
const HURT = 40;
/** Seconds between turns of the circling, so the angles keep changing. */
const SWAP: [number, number] = [6, 11];
/** Share of the jog while shooting: still on the move, steady enough to aim. */
const FIRING_PACE = 0.55;
/** Share of the jog for a crouched player. */
const CRAWL = 0.55;
/** Share of the jog for small steps at a spot, like stepping out round a wall. */
const SHUFFLE = 0.6;
/** Seconds a crouched player stays up after their last shot before dropping back down. */
const POP = 0.6;
/** Seconds a computer player stays down after a burst, by itself. */
const LOW: [number, number] = [0.5, 1.1];
/** Another enemy must be this much nearer, metres, before the body turns to them instead. */
const REFOCUS = 3;

/**
 * Skirmish movement, for players and computer players alike. Each fighter
 * hops along the cover graph from spot to spot: in to the gun's range of
 * the other team, then round them the way it circles, sliding between
 * bunkers so the angles keep changing, never charging in, never camping,
 * never crowding a teammate. A short pause at each spot gives a steady
 * shot; behind a wall the pause is spent stepped out round its side.
 * Reloading or hurt, the next hop backs off a little toward cover.
 *
 * Only a player decides when they crouch: Crouch is a switch, and while
 * it is on they move at a crawl. A shot brings them up for a moment and
 * they drop back down after. The computer may duck by itself after a
 * burst or to reload behind low cover.
 */
export function updateSkirmish(f: Fighter, w: BrainWorld, now: number, dt: number): void {
  const b = f.brain;
  const backing = f.gun.reloading || f.health < HURT;
  // Starting a reload or getting hurt: think again at the next spot.
  if (backing && !b.backing) b.sincePlan = PLAN_EVERY;
  b.backing = backing;
  b.sincePlan += dt;
  b.low = Math.max(0, b.low - dt);
  b.swap -= dt;
  if (b.swap <= 0) {
    b.orbit = b.orbit === 1 ? -1 : 1;
    b.swap = w.rng.range(...SWAP);
  }
  const firing = w.human ? f.trigger.held || f.trigger.pulls > 0 || now - f.shotAt < POP : w.engaged;
  const low = lowNow(f, w, firing);
  let speed = f.gun.spec.speed * w.pace * JOG;
  if (low) speed *= CRAWL;
  if (firing) speed *= FIRING_PACE;

  const from = { ...f.pos };
  if (b.stance === "move") run(f, w, speed * dt);
  else if (b.stance === "peek") peek(f, w, now, speed * SHUFFLE * dt, firing, dt);
  else pause(f, w, speed * SHUFFLE * dt, dt);
  f.rise = false;
  f.vel = { x: (f.pos.x - from.x) / dt, z: (f.pos.z - from.z) / dt };
  if (low) f.pose = "crouch";
  else if (b.stance === "peek") f.pose = "peek";
  else f.pose = len(f.vel) > 0.3 ? "run" : "stand";
  easeCrouch(f, dt);
  face(f, w, dt);
}

/** A computer player's own duck after a burst: low for a moment, at a crawl on the move, or back behind the wall it was out round. */
export function skirmishDuck(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  b.low = w.rng.range(...LOW);
  if (b.stance === "move") return;
  b.stance = "hide";
  b.timer = Math.max(b.timer, b.low);
}

function lowNow(f: Fighter, w: BrainWorld, firing: boolean): boolean {
  if (w.human) return f.duck && !firing;
  const b = f.brain;
  if (b.low > 0) return true;
  // Reloading, the computer kneels while it waits behind low cover.
  if (b.stance !== "hide" || !f.gun.reloading) return false;
  const spot = w.graph.spots[b.spot]!;
  return spot.piece >= 0 && !spot.tall && dist(f.pos, spot.pos) < 0.3;
}

/** Runs the route a spot at a time, thinking again at a spot on the way when it is time. */
function run(f: Fighter, w: BrainWorld, step: number): void {
  const b = f.brain;
  const next = b.route[0];
  if (next === undefined) return arrive(f, w);
  if (!walk(f, w.graph.spots[next]!.pos, step)) return;
  b.route.shift();
  if (b.route.length === 0) arrive(f, w);
  else if (b.sincePlan >= PLAN_EVERY) plan(f, w, next);
}

function arrive(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  b.stance = "hide";
  b.timer = w.rng.range(...PAUSE);
  // Behind a wall the pause is spent stepped out round its side, where there is a shot.
  if (w.graph.spots[b.spot]!.tall) lookOut(f, w);
}

function pause(f: Fighter, w: BrainWorld, step: number, dt: number): void {
  const b = f.brain;
  walk(f, w.graph.spots[b.spot]!.pos, step);
  b.timer -= dt;
  // A player who shoots from behind a wall steps out first.
  if (f.rise && w.human && w.graph.spots[b.spot]!.tall) return lookOut(f, w);
  if (b.timer <= 0) plan(f, w, b.spot);
}

function peek(f: Fighter, w: BrainWorld, now: number, step: number, firing: boolean, dt: number): void {
  const b = f.brain;
  walk(f, b.peekAt ?? w.graph.spots[b.spot]!.pos, step);
  b.timer -= dt;
  b.out += dt;
  if (firing && b.timer < 0.4 && b.out < MAX_PEEK) b.timer = 0.4;
  if (now - f.hitAt < dt * 1.5) b.timer = Math.min(b.timer, FLINCH);
  if (b.timer <= 0) plan(f, w, b.spot);
}

function lookOut(f: Fighter, w: BrainWorld): void {
  const b = f.brain;
  startPeek(f, w);
  b.timer = Math.min(b.timer, MAX_PEEK);
}

/** Picks the next hop from the spot the fighter is at, and sets off. With nowhere to go it waits a moment. */
function plan(f: Fighter, w: BrainWorld, here: number): void {
  const b = f.brain;
  b.sincePlan = 0;
  const hop = pickHop(f, w, here, b.backing);
  if (!hop) {
    b.stance = "hide";
    b.spot = here;
    b.route = [];
    b.timer = 0.3;
    return;
  }
  // Circling, the best hop sometimes goes the other way round, as at the edge of the field: circle that way from now on.
  if (hop.inRange && hop.arc < -1) {
    b.orbit = b.orbit === 1 ? -1 : 1;
    b.swap = w.rng.range(...SWAP);
  }
  const route = [...hop.route];
  // Out round a wall, step back behind it first unless the way on is clear.
  const at = w.graph.spots[here]!.pos;
  if (dist(f.pos, at) > 0.2 && pathBlocked(f.pos, w.graph.spots[route[0]!]!.pos, w.pieces, BODY.radius)) route.unshift(here);
  b.from = here;
  b.spot = hop.spot;
  b.route = route;
  b.stance = "move";
  b.peekAt = null;
}

/** Turns the body and camera toward the enemy in focus, smoothly; the focus moves on only when another is clearly nearer. */
function face(f: Fighter, w: BrainWorld, dt: number): void {
  const b = f.brain;
  const current = w.enemies.find((e) => e.id === b.focus);
  const closest = nearest(f.pos, w.enemies);
  if (!closest) return;
  const target = current && dist(f.pos, closest.pos) > dist(f.pos, current.pos) - REFOCUS ? current : closest;
  b.focus = target.id;
  const want = yawOf({ x: target.pos.x - f.pos.x, z: target.pos.z - f.pos.z });
  const d = turnTo(f.look, want);
  f.look += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
}
