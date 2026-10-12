import { holdsOpen, magazineReload, SHOTGUN_LIFT, shellLoad, shotCycle, shotgunCloseOut, type ActionStep } from "../../ballistics";
import type { WeaponId } from "../../engine/weapons";

/**
 * When each moving part is heard, worked out from the shared action
 * timelines in ballistics/actions.ts so the sound of a part lands on the
 * frame the reload animation shows it. Pure, so it can be tested.
 */

/** Everything a gun can be heard doing besides firing: its steps, the dry click, and the AR's bolt locking open. */
export type GunCue = ActionStep | "dry" | "bolt-lock";

export interface Cue {
  cue: GunCue;
  /** Seconds after the event that starts it. */
  at: number;
}

/** The AR's bolt hits the catch a hair after the last round fires. */
const BOLT_LOCK_DELAY = 0.012;

/**
 * Cues for a reload that just started. A magazine gun's whole reload is
 * known up front. The pump gun only knows its opening: the lift, then the
 * first shell, which the thumb starts into the port a little before the
 * engine counts it in. Each later shell is planned when the one before it lands.
 */
export function reloadCues(weapon: WeaponId, seconds: number, empty: boolean, perShell: number): Cue[] {
  if (weapon === "shotgun") return [{ cue: "lift", at: 0 }, ...shift(shellLoad(perShell), SHOTGUN_LIFT + perShell)];
  return magazineReload(weapon, seconds, empty).map(({ step, at }) => ({ cue: step, at }));
}

/** After a shell lands and the tube still has room: the next shell, timed from this one. */
export function nextShellCues(perShell: number): Cue[] {
  return shift(shellLoad(perShell), perShell);
}

/** After the last shell of a reload from empty: the pump racked to chamber a round. */
export function closeOutCues(): Cue[] {
  return shotgunCloseOut().map(({ step, at }) => ({ cue: step, at }));
}

/**
 * What the gun does after a shot, beyond the bang. The pump is racked by
 * hand, which is worth hearing; an automatic's bolt cycles within the
 * shot itself. The AR's bolt locks open on the last round with a clack
 * that tells the shooter the magazine is empty.
 */
export function shotCues(weapon: WeaponId, left: number): Cue[] {
  if (weapon === "shotgun") return shotCycle(weapon).map(({ step, at }) => ({ cue: step, at }));
  if (holdsOpen(weapon) && left === 0) return [{ cue: "bolt-lock", at: BOLT_LOCK_DELAY }];
  return [];
}

function shift(steps: { step: ActionStep; at: number }[], by: number): Cue[] {
  return steps.map(({ step, at }) => ({ cue: step, at: at + by }));
}
