import { buildOf } from "./athlete";
import { carry } from "./ball-carry";
import { handTo } from "./check-plan";
import { releaseVelocity } from "./dribble-path";
import type { Match } from "./match";
import { aimTimed, backspin } from "./physics/aim";
import { stepBall, type Contact } from "./physics/world";
import type { Athlete } from "./types";
import { COURT } from "./tuning";
import { clamp, dist3, type V3 } from "./vec";

/**
 * The little passes of a check up: the ball picked up and passed out to
 * the checker, then bounced to the defender and back, and a ball thrown
 * back from courtside. They are real throws on the ball physics, aimed
 * at the catcher's chest; nobody can touch them, and the catcher's
 * hands reach for one that comes in a little off.
 */

export interface Toss {
  to: number;
  t: number;
  dur: number;
  /** A bounce pass meets the floor on the way. */
  bounce: boolean;
  bounced: boolean;
}

/** The ball held in both hands at the chest, just in front of the body. */
export function chestPoint(a: Athlete): V3 {
  const h = buildOf(a).body.height;
  return { x: a.x + Math.sin(a.yaw) * 0.32, y: a.y + h * 0.6, z: a.z + Math.cos(a.yaw) * 0.32 };
}

/** Sends the ball off from `start` to the catcher's chest in `dur` seconds, bounced or in the air. */
function throwTo(m: Match, start: V3, catcher: Athlete, dur: number, bounce: boolean): void {
  const b = m.ball;
  const end = chestPoint(catcher);
  b.mode = "flight";
  b.holder = null;
  b.aim = null;
  b.flightKind = null;
  b.passTo = catcher.id;
  b.pos = { ...start };
  b.hand = "none";
  if (bounce) {
    const push = releaseVelocity(start, end, dur);
    b.vel = push.vel;
    b.w = push.spin;
  } else {
    b.w = backspin(start, end, 9);
    b.vel = aimTimed(start, end, dur, b.w);
  }
}

/** Lets the ball go from one player toward another's hands. */
export function startToss(m: Match, from: Athlete, to: Athlete, bounce: boolean): Toss {
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  const dur = Math.max(0.36, d / (bounce ? 5.5 : 8));
  throwTo(m, chestPoint(from), to, dur, bounce);
  m.ball.lastTouch = from.id;
  if (from.action.kind === "none") from.action = { kind: "pass", t: 0 };
  m.emit({ type: "pass", from: from.id, to: to.id, lob: false });
  return { to: to.id, t: 0, dur, bounce, bounced: false };
}

/** A ball that went into the crowd comes back: thrown from where it lies to the checker, as a ball kid would. */
export function returnToss(m: Match, to: Athlete): Toss {
  const b = m.ball;
  // Thrown from courtside: a ball that rolled deep into the stands is picked up at the front row.
  const from = { x: clamp(b.pos.x, -COURT.halfWidth - 1.5, COURT.halfWidth + 1.5), y: Math.max(0.6, Math.min(1.5, b.pos.y)), z: clamp(b.pos.z, -1, COURT.depth + 2.5) };
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  const dur = clamp(d / 8, 0.5, 1.1);
  throwTo(m, from, to, dur, false);
  return { to: to.id, t: 0, dur, bounce: false, bounced: false };
}

/**
 * Moves a toss on and returns true once it is caught: in reach of the
 * catcher's chest, or once it is due and the hands go to it.
 */
export function stepToss(m: Match, toss: Toss, dt: number): boolean {
  const b = m.ball;
  const catcher = m.athletes[toss.to]!;
  toss.t += dt;
  const contacts: Contact[] = [];
  stepBall(b, dt, contacts);
  const floor = contacts.find((c) => c.kind === "floor");
  if (floor && !toss.bounced) {
    toss.bounced = true;
    b.impact = { power: floor.power, age: 0, n: { x: 0, y: 1, z: 0 } };
    m.emit({ type: "bounce", id: catcher.id, x: b.pos.x, z: b.pos.z, power: clamp(floor.power / 7, 0.35, 1) });
  }
  const arrived = dist3(b.pos, chestPoint(catcher)) < 0.45 && (!toss.bounce || toss.bounced);
  if (!arrived && toss.t < toss.dur + 0.25) return false;
  handTo(m, catcher.id);
  catcher.dribble = 0;
  return true;
}

/** Keeps a held ball at the chest instead of dribbling, as players do while the ball is checked. */
export function holdAtChest(m: Match, dt = 1 / 60): void {
  const holder = m.holder;
  if (!holder) return;
  carry(m, chestPoint(holder), dt);
}
