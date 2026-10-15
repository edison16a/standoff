import { RIM_SPOT, rimDistance } from "../court";
import { startDrive } from "../drive";
import { floaterFits, startFloater } from "../floater";
import type { Match } from "../match";
import { SHOT } from "../tuning";
import type { Athlete } from "../types";
import { dir2 } from "../vec";
import { letGo, pressAgain, settle, type FinishCall } from "./pick-up";

/**
 * Shoot at the rim for a person, read by the tap rules (`pick-up.ts`)
 * instead of thrown at once: the press is held open for a moment, the
 * player running on, until it reads as a hold, a tap or a double tap.
 * The computer and the films call their finish straight away.
 */

/** Whether this player's press at the rim goes through the tap rules. */
export function readsTaps(m: Match, a: Athlete): boolean {
  return m.finishTaps && !a.auto && !m.forcedFinish;
}

/** Shoot pressed at the rim: opens a press to read. */
export function startPickUp(m: Match, a: Athlete): void {
  m.pickUps.set(a.id, { at: m.time, up: null });
}

/** Shoot pressed again on a press still being read. Returns true when this press belonged to it. */
export function pressAtRim(m: Match, a: Athlete): boolean {
  const p = m.pickUps.get(a.id);
  if (!p) return false;
  if (pressAgain(p, m.time) === "dunk") finishAs(m, a, "dunk");
  return true;
}

/** Shoot let go on a press still being read. */
export function liftAtRim(m: Match, a: Athlete): void {
  const p = m.pickUps.get(a.id);
  if (p) letGo(p, m.time);
}

/** Each step: a press that has become a hold or a lone tap is a layup. A lost ball or a dead whistle drops it. */
export function settlePickUps(m: Match): void {
  for (const [id, p] of m.pickUps) {
    const a = m.athletes[id];
    if (!a || m.phase !== "live" || m.ball.holder !== id || a.auto || a.action.kind !== "none") {
      m.pickUps.delete(id);
      continue;
    }
    const call = settle(p, m.time);
    if (call) finishAs(m, a, call);
  }
}

function finishAs(m: Match, a: Athlete, call: FinishCall): void {
  m.pickUps.delete(a.id);
  if (a.action.kind !== "none" || m.ball.holder !== a.id) return;
  const d = rimDistance(a);
  const speed = Math.hypot(a.vx, a.vz);
  const to = dir2(a, RIM_SPOT);
  const heading = speed > 0.1 ? (a.vx * to.x + a.vz * to.z) / speed : 0;
  // From the edge of the paint the layup is the floater, high over the hands.
  if (call === "layup" && d >= SHOT.driveRange && floaterFits(m, a, d, speed, heading)) return startFloater(m, a);
  startDrive(m, a, { dunk: call === "dunk", stick: { ...a.stick }, frame: { toRim: to, off: a.x - RIM_SPOT.x } });
}
