import { buildOf } from "./athlete";
import { carry } from "./ball-carry";
import { CATCH, RELEASE, carryStep, handSpot, inContact, phaseGap, releaseVelocity } from "./dribble-path";
import type { Match } from "./match";
import { stepBall, type Contact } from "./physics/world";
import type { Athlete } from "./types";
import { clamp, lerp } from "./vec";

/**
 * The dribble, on the same ball physics as everything else. The hand
 * takes the ball as it rises, rides it up, turns it and pushes it down
 * with the speed and roll that bring it back to where the hand will be;
 * between, the ball is on its own, bouncing off the maple like any ball.
 * The rhythm keeps time with the feet, and the animation reads the same
 * clock: one bounce every two steps on the run, a quick hard pound
 * standing still, and the moves speeding it up or holding it.
 */

/** The legs of the model, hip to ankle, as a share of the player's height. */
export const LEG_SHARE = 0.477;

/** How far each hip swings through a stride, in radians, growing with speed. */
export const strideSwing = (speed: number) => 0.12 + Math.min(1, speed / 6.5) * 0.72;

/**
 * The ground covered by one full stride cycle (a step with each foot)
 * for legs of length `leg`. The stride advances by the distance run
 * over this, so a planted foot moves back exactly as fast as the body
 * goes forward and the feet do not skate.
 */
export function strideLength(speed: number, leg: number, guarding: boolean): number {
  // Feet split 2 leg sin(swing) apart at full stride; the bent knee shortens that a little.
  const swing = guarding ? 0.3 : strideSwing(speed);
  return Math.max(0.35, 4 * leg * Math.sin(swing) * 0.88);
}

/** Bounces a second standing still: the low, hard pound dribble. */
const POUND = 2.3;
/** After a catch or a pickup the ball sits in both hands this long before the first push. */
export const POCKET = 0.22;
/** The spin pulls the ball through the turn in one hand until this far into the move. */
const SPIN_CARRY = 0.46;
/** A ball this far from the hand when it should be caught has got away; nearer, a reach and a step get to it. */
const LOST = 1.7;

/** How fast the ball bounces right now, in bounces a second. */
export function dribbleRate(a: Athlete, speed: number): number {
  const leg = LEG_SHARE * buildOf(a).body.height;
  const stride = speed / strideLength(speed, leg, false);
  const base = lerp(POUND, Math.max(1.5, stride), clamp(speed / 1.6, 0, 1));
  const act = a.action;
  if (act.kind !== "move") return base;
  switch (act.move) {
    case "crossover":
    case "behindBack":
      // A quick, low push across; a ball still on its way up is met early.
      return Math.max(3, base * 1.5) * (a.crossArmed ? 1 : 1.8);
    case "hesitation":
      return act.t < 0.26 ? 1.4 : 3;
    case "stepback":
      return 2.8;
    case "spin":
      // Quick back up into the hand, to be pulled round.
      return 5;
  }
}

/** True while the ball sits in the hand rather than bouncing: the pocket after a catch, or the pull through a spin. */
export const palmHold = (a: Athlete): boolean => a.pocket > 0;

/** Pulled through a spin in the dribbling hand, rather than held in both at the chest. */
export const spinCarry = (a: Athlete): boolean => a.pocket > 0 && a.action.kind === "move" && a.action.move === "spin";

/** The ball on the dribble, or held a moment in the hand. `rate` sets the bounces a second, for the routine at the free throw line. */
export function dribbleBall(m: Match, a: Athlete, dt: number, rate = dribbleRate(a, Math.hypot(a.vx, a.vz))): void {
  if (a.pocket > 0) return pocket(m, a, dt);
  // Coming to the dribble from anything else, or put somewhere new by a film or a test, the hand has the ball first.
  const b = m.ball;
  if ((b.hand !== "dribble" && b.hand !== "free") || Math.hypot(b.pos.x - a.x, b.pos.z - a.z) > 2.5) a.dribble = 0;
  if (inContact(a.dribble)) handPhase(m, a, dt, rate);
  else freePhase(m, a, dt, rate);
}

function pocket(m: Match, a: Athlete, dt: number): void {
  a.pocket = Math.max(0, a.pocket - dt);
  a.dribble = 0;
  const h = buildOf(a).body.height;
  const carried = spinCarry(a);
  const fwd = carried ? 0.14 : 0.3;
  const side = carried ? 0.34 * a.dribbleHand : 0;
  const fx = Math.sin(a.yaw);
  const fz = Math.cos(a.yaw);
  carry(m, { x: a.x + fx * fwd - fz * side, y: a.y + h * (carried ? 0.5 : 0.6), z: a.z + fz * fwd + fx * side }, dt);
}

/** The hand has the ball: ride it, turn it and push it down on time. */
function handPhase(m: Match, a: Athlete, dt: number, rate: number): void {
  const b = m.ball;
  const left = phaseGap(a.dribble, RELEASE, rate);
  const free = phaseGap(RELEASE, CATCH, rate);
  const from = handSpot(a, a.dribbleSide, left);
  const to = handSpot(a, a.crossArmed ? a.dribbleHand : a.dribbleSide, left + free);
  const push = releaseVelocity(from, to, free);
  b.hand = "dribble";
  if (left <= dt) {
    b.pos = from;
    b.vel = push.vel;
    b.w = push.spin;
    b.hand = "free";
    b.flightT = 0;
    a.dribble = RELEASE;
    return;
  }
  const step = carryStep(b.pos, b.vel, from, push.vel, left, dt);
  b.pos = step.pos;
  b.vel = step.vel;
  // The fingers spread on the leather turn it toward the roll it leaves with.
  const k = 1 - Math.exp(-dt * 12);
  b.w = { x: b.w.x + (push.spin.x - b.w.x) * k, y: b.w.y * (1 - k), z: b.w.z + (push.spin.z - b.w.z) * k };
  a.dribble = (a.dribble + rate * dt) % 1;
}

/** The ball is on its own: down to the floor and back up into the hand. */
function freePhase(m: Match, a: Athlete, dt: number, rate: number): void {
  const b = m.ball;
  const contacts: Contact[] = [];
  stepBall(b, dt, contacts);
  b.flightT += dt;
  b.hand = "free";
  for (const c of contacts) {
    if (c.kind !== "floor") continue;
    b.impact = { power: c.power, age: 0, n: { x: 0, y: 1, z: 0 } };
    m.emit({ type: "bounce", id: a.id, x: b.pos.x, z: b.pos.z, power: clamp(c.power / 7, 0.35, 1) });
  }
  const bounced = b.impact.age < b.flightT;
  const hand = handSpot(a, a.crossArmed ? a.dribbleHand : a.dribbleSide, 0);
  // Up to the hand, or topping out short of it: the hand meets it there.
  const met = bounced && b.vel.y > 0 && (b.pos.y >= hand.y || b.vel.y < 0.5);
  const next = a.dribble + rate * dt;
  if (met || (next >= CATCH && (bounced || b.flightT > 1.2))) return take(m, a, hand);
  // The clock waits at the catch for a ball that has not come back up yet.
  a.dribble = Math.min(next, CATCH - 1e-3);
}

/** The hand takes the ball back, or it has got away. */
function take(m: Match, a: Athlete, hand: { x: number; z: number }): void {
  const b = m.ball;
  a.dribble = CATCH;
  if (Math.hypot(b.pos.x - hand.x, b.pos.z - hand.z) > LOST) {
    b.mode = "loose";
    b.holder = null;
    b.hand = "none";
    a.grabCd = 0.4;
    m.emit({ type: "fumble", id: a.id, by: null });
    return;
  }
  b.hand = "dribble";
  // Back in the hand: a cross waiting on this bounce can go now, and a spin takes the ball with it.
  a.crossArmed = true;
  const act = a.action;
  if (act.kind === "move" && act.move === "spin" && act.t < SPIN_CARRY) {
    a.pocket = SPIN_CARRY - act.t;
    a.dribble = 0;
  }
}
