import { buildOf, standingReach } from "./athlete";
import { interceptChance } from "./build-effects";
import { startDrive } from "./drive";
import { catchAlley } from "./finish/alley";
import type { Match } from "./match";
import { between } from "./rng";
import { gainPossession } from "./rules";
import { PASS } from "./tuning";
import type { Athlete } from "./types";

/**
 * The hands on a ball in the air that are not blocks (those are in
 * `blocks/`): a pass is caught when it comes to the receiver's hands,
 * or picked off by a defender it passes. A loose ball goes to whoever
 * reaches it.
 */

/** A pass is caught when it reaches the receiver's hands, or picked off by a defender it passes close to. */
export function passCaught(m: Match): boolean {
  const b = m.ball;
  const receiver = b.passTo === null ? null : m.athletes[b.passTo];
  if (receiver && receiver.action.kind !== "drive" && inHands(receiver, b.pos, 0.75)) {
    gainPossession(m, receiver);
    receiver.dribble = 0;
    m.emit({ type: "catch", id: receiver.id });
    if (m.alleyLob === receiver.id) catchAlley(m, receiver, startDrive);
    return true;
  }
  if (b.flightT < 0.08 || !receiver) return false;
  for (const d of m.opponents(receiver.team)) {
    if (b.passRolled.includes(d.id)) continue;
    if (Math.hypot(b.pos.x - d.x, b.pos.z - d.z) > PASS.interceptRange || b.pos.y > standingReach(d) + d.y - 0.15) continue;
    b.passRolled.push(d.id);
    const passer = b.lastTouch ?? receiver.id;
    if (d.action.kind !== "none" || m.rng() >= interceptChance(buildOf(d).stats, buildOf(m.athletes[passer] ?? receiver).stats)) continue;
    // Most are clean picks; some only get a finger on it and knock it loose.
    if (m.rng() < 0.3) {
      tip(m, d);
      return true;
    }
    gainPossession(m, d);
    d.box.steals++;
    m.emit({ type: "intercept", id: d.id, victim: passer });
    return true;
  }
  return false;
}

/** A fingertip on a pass: the ball slows and flies off at an angle, loose. */
function tip(m: Match, d: Athlete): void {
  const b = m.ball;
  const side = between(m.rng, -1, 1);
  b.vel = { x: b.vel.x * 0.35 + side * 2, y: Math.abs(b.vel.y) * 0.3 + between(m.rng, 0.5, 2), z: b.vel.z * 0.35 - side * 2 };
  b.w = { x: between(m.rng, -15, 15), y: between(m.rng, -8, 8), z: between(m.rng, -15, 15) };
  b.mode = "loose";
  b.flightKind = null;
  b.passTo = null;
  b.aim = null;
  b.lastTouch = d.id;
  m.emit({ type: "tip", id: d.id, at: { ...b.pos } });
}

/** Whether the ball is where this player's hands can take it: in front of the body between the knees and full stretch. */
function inHands(a: Athlete, p: { x: number; y: number; z: number }, reach: number): boolean {
  const top = a.y + standingReach(a) + (a.action.kind === "block" ? 0.1 : 0);
  return Math.hypot(p.x - a.x, p.z - a.z) < reach && p.y > a.y + 0.35 && p.y < top;
}

/** The nearest player who can reach a loose ball takes it. Jumping reaches higher and a little wider. */
export function grab(m: Match): void {
  const b = m.ball;
  let best: Athlete | null = null;
  let bestD = Infinity;
  for (const a of m.athletes) {
    const k = a.action.kind;
    if (a.grabCd > 0 || k === "shoot" || k === "drive" || k === "stumble") continue;
    const d = Math.hypot(b.pos.x - a.x, b.pos.z - a.z);
    const jumping = k === "block";
    if (d > (jumping ? 0.8 : 0.58) || b.pos.y > standingReach(a) + a.y + (jumping ? 0.1 : 0)) continue;
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  if (!best) return;
  gainPossession(m, best);
  best.dribble = 0;
}
