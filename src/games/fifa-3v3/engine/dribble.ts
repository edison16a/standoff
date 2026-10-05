import { firstTime } from "./buttons";
import { atFeet, BOOT_REACH } from "./reach";
import { rollSpeedFor, rollSpeedIn } from "./physics/roll-table";
import { rollingSpin } from "./passing";
import { predictRun, topSpeed } from "./locomotion";
import { cycleLength, TOUCH_AT } from "./stride";
import { BALL, MOVE, PITCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, clamp01, dist, len, type Vec2 } from "./vec";

/**
 * The dribble as real touches. The ball is loose between touches and
 * rolls on the turf like any ball, so a defender who gets a foot to it
 * in between can take it. On the lead boot's swing the player knocks it
 * on to where he will be by his next touch: every stride when he is
 * walking or jogging, every few at a sprint, so at pace it runs a yard
 * or more ahead of him. A sharp turn, or letting go of the stick, gets
 * a quick touch of its own to turn it or stop it under the sole.
 * Touches are never perfect: worse at pace, for a poor dribbler, and
 * just after a shove.
 */
export const DRIBBLE = {
  /** Where the ball sits ahead of the body when a touch is due. */
  carry: 0.42,
  /** The furthest from the boot a touch reaches. */
  reach: BOOT_REACH,
  /** Further from the body than this and it is nobody's ball any more. */
  lose: 3,
  /** A stick this far off the ball's line, radians, asks for a turning touch. */
  turn: 0.9,
  /** Seconds between quick turning or stopping touches. */
  cool: 0.22,
  /** Spread of a touch's direction for the best and worst dribbler, radians, at a walk. */
  clean: 0.025,
  sloppy: 0.07,
} as const;

/**
 * Strides between pushes: one when slow or with a man close, up to four
 * flat out in space for a poor dribbler.
 */
export function stridesPerTouch(a: Athlete, speed: number, pressure = 0): number {
  const f = clamp01(speed / topSpeed(a)) * (1 - pressure);
  return clamp(Math.round(1 + 3.2 * f * f * (1.3 - 0.6 * a.attrs.dribbling)), 1, 4);
}

/** The nearest opponent, and how close he is as pressure: 0 three metres away or more, 1 on top of him. */
function marker(state: MatchState, a: Athlete): { foe: Athlete | null; pressure: number } {
  let foe: Athlete | null = null;
  let best = Infinity;
  for (const o of state.athletes) {
    if (o.team === a.team) continue;
    const d = dist(o.pos, a.pos);
    if (d < best) {
      best = d;
      foe = o;
    }
  }
  return { foe, pressure: clamp01((3 - best) / 2) };
}

/**
 * Where a dribbler runs. With the ball at his boot, where the stick
 * says. With it a stride or more ahead he has to get to it first: he
 * runs onto it (where it will be in a moment), however the stick is
 * pushed, and the stick takes over again at the next touch. Nobody
 * turns or stops with a ball that is still rolling away from him.
 */
export function dribbleSteer(state: MatchState, a: Athlete, stick: Vec2): Vec2 {
  const ball = state.ball;
  if (atFeet(state, a)) return stick;
  const to = { x: ball.pos.x + ball.vel.x * 0.25 - a.pos.x, z: ball.pos.z + ball.vel.z * 0.25 - a.pos.z };
  const d = Math.hypot(to.x, to.z);
  if (d < 1e-6) return stick;
  const pace = Math.max(len(stick), 0.85);
  return { x: (to.x / d) * pace, z: (to.z / d) * pace };
}

/** Top speed with the ball, as moveAthlete has it. */
const carryTop = (a: Athlete) => topSpeed(a) * (MOVE.withBall + 0.1 * a.attrs.dribbling);

/**
 * One step of the dribbler's feet, after the ball has rolled on: takes a
 * touch if one is due and the ball is at the boot. Returns false when
 * the ball has got away from him for good.
 */
export function dribble(state: MatchState, a: Athlete, strideBefore: number, dt: number): boolean {
  const ball = state.ball;
  a.touchCool = Math.max(0, a.touchCool - dt);
  a.shove *= Math.exp(-3 * dt);
  if (dist(a.pos, ball.pos) > DRIBBLE.lose) return false;
  if (!atFeet(state, a)) return true;
  // A kick pressed while the ball was a stride ahead is struck as he gets to it.
  if (a.buffered > 0) {
    firstTime(state, a, false);
    if (a.action !== "free") return true;
  }
  const kind = touchDue(a, strideBefore, state);
  if (kind) touch(state, a, kind);
  return true;
}

type TouchKind = "push" | "turn" | "stop";

function touchDue(a: Athlete, strideBefore: number, state: MatchState): TouchKind | null {
  const ball = state.ball;
  const speed = len(a.vel);
  const stick = len(a.want);
  const ballSpeed = Math.hypot(ball.vel.x, ball.vel.z);
  if (a.touchCool <= 0 && stick < 0.2 && ballSpeed > 1.2) return "stop";
  if (a.touchCool <= 0 && stick > 0.3 && ballSpeed > 0.8) {
    const cos = (a.want.x * ball.vel.x + a.want.z * ball.vel.z) / (stick * ballSpeed);
    if (cos < Math.cos(DRIBBLE.turn)) return "turn";
  }
  if (speed < 1.5) {
    // Walking it: little taps whenever it drifts off the boot.
    const rel = Math.hypot(ball.vel.x - a.vel.x, ball.vel.z - a.vel.z);
    return a.touchCool <= 0 && stick > 0.2 && rel > 1 ? "push" : null;
  }
  // Running past it: touch it on now rather than leave it behind.
  const ahead = (ball.pos.x - a.pos.x) * Math.cos(a.facing) + (ball.pos.z - a.pos.z) * Math.sin(a.facing);
  if (ahead < 0.2 && a.touchCool <= 0) return "push";
  // The lead boot's swing ends on the ball (stride.ts), on the stride the last touch was played for.
  const crossed = Math.floor(a.stride - TOUCH_AT) > Math.floor(strideBefore - TOUCH_AT);
  return crossed && a.stride - a.touchStride >= a.touchEvery - 0.05 ? "push" : null;
}

/** Plays the touch: rolls the ball to where he will be by the next one, with the error a touch brings. */
export function touch(state: MatchState, a: Athlete, kind: TouchKind): void {
  const ball = state.ball;
  const rng = state.rng;
  const top = carryTop(a);
  const stick = len(a.want);
  const want: Vec2 = stick > 0.2 ? { x: a.want.x * top, z: a.want.z * top } : { ...a.vel };
  a.touchStride = a.stride;
  a.touchCool = DRIBBLE.cool;
  ball.lastTouch = { team: a.team, id: a.id };
  ball.pos.y = BALL.radius;
  if (kind === "stop") {
    // Under the sole: the ball stops with the body.
    ball.vel = { x: a.vel.x * 0.85, y: 0, z: a.vel.z * 0.85 };
    ball.spin = rollingSpin(ball.vel);
    return;
  }
  // Where his legs will have carried him by the next touch, running the way the stick says.
  const { foe, pressure } = marker(state, a);
  const stickNow = stick > 0.2 ? a.want : { x: a.vel.x / top, z: a.vel.z / top };
  const guess = Math.max(1.5, (len(a.vel) + len(want)) / 2);
  a.touchEvery = stridesPerTouch(a, guess, pressure);
  const next = guess > 1.5 || stick > 0.2 ? (a.touchEvery * cycleLength(guess)) / guess : 0.45;
  const ahead = predictRun(a, stickNow, next);
  const pace = len(ahead.vel);
  const run = pace > 0.2 ? { x: ahead.vel.x / pace, z: ahead.vel.z / pace } : { x: Math.cos(a.facing), z: Math.sin(a.facing) };
  // With a man close the ball is kept tighter and on the far side of the body from him: the shield.
  const carry = DRIBBLE.carry - 0.12 * pressure;
  const away = foe ? -Math.sign((foe.pos.x - a.pos.x) * -run.z + (foe.pos.z - a.pos.z) * run.x) || 1 : 0;
  const shield = 0.16 * pressure * away;
  const lim = { x: PITCH.halfLength - 0.6, z: PITCH.halfWidth - 0.4 };
  const want2 = { x: ahead.pos.x + run.x * carry - run.z * shield, z: ahead.pos.z + run.z * carry + run.x * shield };
  const spot = { x: clamp(want2.x, -lim.x, lim.x), z: clamp(want2.z, -lim.z, lim.z) };
  const dx = spot.x - ball.pos.x;
  const dz = spot.z - ball.pos.z;
  const d = Math.max(0.01, Math.hypot(dx, dz));
  // Up against the line or the boards it is played to stop on the spot, never on over it.
  const penned = spot.x !== want2.x || spot.z !== want2.z;
  let v0 = penned ? rollSpeedFor(d, 0) : rollSpeedIn(d, next);
  const spread = (DRIBBLE.clean + (DRIBBLE.sloppy - DRIBBLE.clean) * (1 - a.attrs.dribbling)) * (0.4 + pace / top) * (kind === "turn" ? 1.5 : 1) + 0.04 * a.shove;
  const angle = Math.atan2(dz, dx) + rng.gauss() * spread;
  v0 *= 1 + rng.gauss() * spread * 0.8;
  ball.vel = { x: Math.cos(angle) * v0, y: 0, z: Math.sin(angle) * v0 };
  ball.spin = rollingSpin(ball.vel);
}
