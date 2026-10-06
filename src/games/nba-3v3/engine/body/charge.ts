import { rimDistance } from "../court";
import { callFoul, type FoulKind } from "../foul-call";
import type { Match } from "../match";
import { startDead } from "../check-up";
import type { Athlete } from "../types";
import type { BodyHit } from "./contact";

/**
 * The referee's read of a collision between the ball handler and a
 * defender, the way the rule book has it. A defender who got there
 * first, set and square, outside the arc under the rim, has the right to
 * his spot: running him over is a charge, and the ball goes the other
 * way. A defender who moves into the handler is blocking: a foul, and
 * two shots. Anything gentler, or a defender giving ground, is play on.
 * The referee does not see every one.
 */

export const CHARGE = {
  /** Slower than this closing, contact is incidental. */
  closing: 3,
  /** The handler must be running into the defender at least this fast for a charge. */
  drive: 2.5,
  /** A defender sliding sideways slower than this is set. */
  set: 0.9,
  /** A defender stepping into the handler faster than this is blocking. */
  stepIn: 2.2,
  /** Inside this arc under the rim no charge is ever taken. */
  restricted: 1.25,
  /** How often the referee sees a charge and blows; a block in a crowd of bodies is seen less. */
  seen: 0.65,
  seenBlock: 0.3,
  /** Seconds the referee shows a charge before play goes on to the check. */
  show: 1.9,
  /** Seconds the defender is down after taking the charge, and the handler stumbles on. */
  fall: 1.3,
  lurch: 0.5,
} as const;

/** What the contact was: a charge, a blocking foul, or nothing to call. */
export function judge(handler: Athlete, defender: Athlete, closing: number, handlerInto: number, defenderInto: number): FoulKind | null {
  if (closing < CHARGE.closing) return null;
  if (handler.action.kind !== "none" && handler.action.kind !== "move") return null;
  const dx = handler.x - defender.x;
  const dz = handler.z - defender.z;
  const d = Math.hypot(dx, dz) || 1;
  // Square: the defender's chest faces the man coming at him.
  const facing = (Math.sin(defender.yaw) * dx + Math.cos(defender.yaw) * dz) / d;
  // Sideways speed across the line between them; giving ground straight back is still a legal guard.
  const lateral = Math.abs((defender.vx * dz - defender.vz * dx) / d);
  const legal = defender.y < 0.02 && defender.action.kind === "none" && facing > 0.4 && defenderInto <= 0.3 && lateral < CHARGE.set;
  if (defenderInto > CHARGE.stepIn) return "block";
  if (handlerInto <= CHARGE.drive) return null;
  if (legal) return rimDistance(defender) > CHARGE.restricted ? "charge" : "block";
  // Sliding across late, into the path, is a block too.
  return lateral > CHARGE.stepIn ? "block" : null;
}

/** Hears a body hit in the match and blows the whistle when the referee sees a foul in it. */
export function refereeHit(m: Match, a: Athlete, b: Athlete, hit: BodyHit): void {
  const handler = m.holder;
  if (m.phase !== "live" || !handler || (a !== handler && b !== handler)) return;
  const defender = a === handler ? b : a;
  if (defender.team === handler.team) return;
  const handlerInto = a === handler ? hit.intoA : hit.intoB;
  const defenderInto = a === handler ? hit.intoB : hit.intoA;
  const call = judge(handler, defender, hit.closing, handlerInto, defenderInto);
  if (!call || m.rng() >= (call === "charge" ? CHARGE.seen : CHARGE.seenBlock)) return;
  if (call === "block") return callFoul(m, defender, handler, 2, "block");
  callCharge(m, handler, defender);
}

/** An offensive foul: the whistle, the ball dropped, and the other team checks it up. */
export function callCharge(m: Match, handler: Athlete, defender: Athlete): void {
  m.foulCall = { kind: "charge", fouler: handler.id, victim: defender.id, at: m.time, spot: { x: (handler.x + defender.x) / 2, z: (handler.z + defender.z) / 2 }, andOne: false };
  m.emit({ type: "foul", id: handler.id, victim: defender.id, attempt: 0, shooting: false, call: "charge" });
  const b = m.ball;
  b.mode = "loose";
  b.holder = null;
  b.vel = { x: 0, y: 1.2, z: 0 };
  b.shot = null;
  // The man who held his spot goes down on his backside; the one who ran him over lurches on over him.
  handler.action = { kind: "stumble", t: 0, dur: CHARGE.lurch, fall: "forward" };
  defender.action = { kind: "stumble", t: 0, dur: CHARGE.fall, fall: "back" };
  startDead(m, defender.team);
}

/** The referee walks off a charge once he has shown it; free throws clear their own call at the line. */
export function endCharge(m: Match): void {
  if (m.foulCall?.kind === "charge" && m.time - m.foulCall.at > CHARGE.show) m.foulCall = null;
}

/**
 * Test shortcut for the admin panel: a charge by whoever has the ball
 * into the nearest defender, or with `block` a blocking foul by that
 * defender. Only while play is live.
 */
export function forceContactFoul(m: Match, block: boolean): boolean {
  const handler = m.holder;
  if (m.phase !== "live" || !handler) return false;
  const defender = m.opponents(handler.team).sort((p, q) => Math.hypot(p.x - handler.x, p.z - handler.z) - Math.hypot(q.x - handler.x, q.z - handler.z))[0];
  if (!defender) return false;
  if (block) callFoul(m, defender, handler, 2, "block");
  else callCharge(m, handler, defender);
  return true;
}
