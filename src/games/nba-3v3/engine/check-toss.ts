import { charOf } from "./athlete";
import { handTo } from "./check-plan";
import type { Match } from "./match";
import type { Athlete } from "./types";
import { lerp, type V3 } from "./vec";

/**
 * The little passes of a check up: the ball picked up and passed out to
 * the checker, then bounced to the defender and back. They are short
 * and nobody can touch them, so rather than planned flights they home
 * in on the catcher's hands and always arrive.
 */

export interface Toss {
  from: V3;
  to: number;
  t: number;
  dur: number;
  /** A bounce pass hits the floor a little past halfway. */
  bounce: boolean;
  bounced: boolean;
}

/** Where the floor is met on a bounce pass, along the way. */
const BOUNCE_AT = 0.58;

/** The ball held in both hands at the chest, just in front of the body. */
export function chestPoint(a: Athlete): V3 {
  const h = charOf(a).build.height;
  return { x: a.x + Math.sin(a.yaw) * 0.32, y: a.y + h * 0.6, z: a.z + Math.cos(a.yaw) * 0.32 };
}

/** Lets the ball go from one player toward another's hands. */
export function startToss(m: Match, from: Athlete, to: Athlete, bounce: boolean): Toss {
  const b = m.ball;
  const start = chestPoint(from);
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  b.mode = "flight";
  b.holder = null;
  b.flight = null;
  b.flightKind = null;
  b.pos = { ...start };
  b.spin = bounce ? 6 : 9;
  b.lastTouch = from.id;
  if (from.action.kind === "none") from.action = { kind: "pass", t: 0 };
  m.emit({ type: "pass", from: from.id, to: to.id, lob: false });
  return { from: start, to: to.id, t: 0, dur: Math.max(0.36, d / (bounce ? 5.5 : 8)), bounce, bounced: false };
}

/**
 * Moves a toss on and returns true once it is caught. Between the hands
 * it runs in a gentle arc, or down to the floor and back up for a
 * bounce pass, the floor meeting sounding like a dribble.
 */
export function stepToss(m: Match, toss: Toss, dt: number): boolean {
  const b = m.ball;
  const catcher = m.athletes[toss.to]!;
  toss.t += dt;
  const u = Math.min(1, toss.t / toss.dur);
  const end = chestPoint(catcher);
  const prev = { ...b.pos };
  let y: number;
  if (toss.bounce) {
    // Straight lines down to the floor and back up, bowed a touch like a real bounce.
    const floor = 0.13;
    y = u < BOUNCE_AT ? lerp(toss.from.y, floor, Math.pow(u / BOUNCE_AT, 1.15)) : lerp(floor, end.y, Math.pow((u - BOUNCE_AT) / (1 - BOUNCE_AT), 0.85));
    if (!toss.bounced && u >= BOUNCE_AT) {
      toss.bounced = true;
      m.emit({ type: "bounce", id: catcher.id, x: b.pos.x, z: b.pos.z, power: 0.6 });
    }
  } else {
    y = lerp(toss.from.y, end.y, u) + Math.sin(u * Math.PI) * 0.25;
  }
  b.pos = { x: lerp(toss.from.x, end.x, u), y, z: lerp(toss.from.z, end.z, u) };
  const k = dt > 0 ? 1 / dt : 0;
  b.vel = { x: (b.pos.x - prev.x) * k, y: (b.pos.y - prev.y) * k, z: (b.pos.z - prev.z) * k };
  if (u < 1) return false;
  handTo(m, catcher.id);
  catcher.dribble = 0;
  return true;
}

/** Keeps a held ball at the chest instead of dribbling, as players do while the ball is checked. */
export function holdAtChest(m: Match): void {
  const holder = m.holder;
  if (!holder) return;
  m.ball.pos = chestPoint(holder);
  m.ball.vel = { x: 0, y: 0, z: 0 };
}
