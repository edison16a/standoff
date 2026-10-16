import { attackSign } from "../teams";
import type { Match } from "./match";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/**
 * A phone that throws or pitches to a computer teammate takes him over
 * at once (control.ts), but its thumb is still on the QB's stick, most
 * often pulled back for the drop. Read as the receiver's stick, that sent
 * him back toward his own end zone, facing the wrong way, with the ball
 * on its way to him. So the stick he was taken over with is latched:
 * until the thumb lets go or moves off it, he plays on as the computer
 * would, after the ball and then upfield with it.
 */

/** How far the stick must move off the latched one, or how close to the middle it must come, to hand him back to the thumb. */
export const LATCH = { moved: 0.5, centre: 0.2 } as const;

/** Latches the stick the phone holds as it takes `to` over; a stick resting in the middle needs no latch. */
export function latchStick(to: Athlete, stick: V2): void {
  to.latch = Math.hypot(stick.x, stick.z) >= LATCH.centre ? { x: stick.x, z: stick.z } : null;
}

/** A new stick reading: the latch lets go once the thumb comes off the latched stick. */
export function followStick(a: Athlete, stick: V2): void {
  const l = a.latch;
  if (!l) return;
  if (Math.hypot(stick.x - l.x, stick.z - l.z) > LATCH.moved || Math.hypot(stick.x, stick.z) < LATCH.centre) a.latch = null;
}

/**
 * The stick a latched player runs on: the ball's read while it is in
 * the air, then straight upfield once it is his; with no read he runs
 * on the way he is going. Null when he is not latched.
 */
export function latchedLegs(m: Match, a: Athlete, read: V2 | null): V2 | null {
  if (!a.latch || a.auto) return null;
  if (read) return read;
  if (m.carrier() === a) return { x: attackSign(a.team), z: 0 };
  const speed = Math.hypot(a.vx, a.vz);
  return speed > 0.5 ? { x: a.vx / speed, z: a.vz / speed } : { x: 0, z: 0 };
}
