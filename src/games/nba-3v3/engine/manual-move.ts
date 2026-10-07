import type { Athlete } from "./types";

export interface ManualBoost {
  /** Top speed, leg power and grip, each as a multiple of the plain body's. */
  speed: number;
  power: number;
  grip: number;
}

/**
 * A person on the stick moves quicker and sharper than the body alone
 * would: play testers found the players slow to answer the thumb, and a
 * defender on the stick could not stay in front. With the ball the dribble
 * still holds him back a little, so the boost is smaller there. Guard
 * held with the stick let go runs on the plain body, so taking over with
 * the stick is always the quicker way.
 */
export const MANUAL = {
  /** A stick pushed further than this is a person steering. */
  stick: 0.1,
  ball: { speed: 1.08, power: 1.35, grip: 1.15 },
  free: { speed: 1.12, power: 1.7, grip: 1.35 },
} as const;

const NONE: ManualBoost = { speed: 1, power: 1, grip: 1 };

/** Whether a person is steering this player with the stick right now. */
export function onStick(a: Athlete): boolean {
  return !a.auto && Math.hypot(a.stick.x, a.stick.z) > MANUAL.stick;
}

/** The boost for this player now: none for the computer, Guard or a stick at rest. */
export function manualBoost(a: Athlete, hasBall: boolean): ManualBoost {
  if (!onStick(a)) return NONE;
  return hasBall ? MANUAL.ball : MANUAL.free;
}
