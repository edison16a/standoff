import { holdsOpen, shotCycle, type ActionStep } from "../../ballistics";
import type { WeaponId } from "../../engine/weapons";
import { play, span } from "./keyframes";
import { add, type GunPose } from "./pose";
import { TRAVEL } from "./rest";

/** What the rig remembers between shots. */
export interface ShotState {
  /** Seconds since the last shot, large when the gun has not fired. */
  since: number;
  /** Rounds left after the last shot. */
  left: number;
  /** Seconds since the first shot, which pops the AR's dust cover open for good. */
  sinceFirst: number;
}

/**
 * The real bolt is back and home again in under a hundredth of a second,
 * quicker than a frame. Holding it back a frame or so and easing it home
 * lets the eye catch the port flicking open on every shot.
 */
const SEEN_BACK = 0.02;
const SEEN_HOME = 0.055;

const stepAt = (steps: { step: ActionStep; at: number }[], step: ActionStep) => steps.find((s) => s.step === step)?.at ?? 0;

/**
 * What the gun does by itself after each shot, laid over the rest pose:
 * an automatic's carrier runs back and forward (the AR's stays back on
 * the last round), and the pump gun is racked by hand at the shot cycle's
 * times, the hand riding the fore end.
 */
export function shotLayer(weapon: WeaponId, pose: GunPose, shot: ShotState): GunPose {
  const steps = shotCycle(weapon);
  if (weapon === "shotgun") {
    const back = stepAt(steps, "pump-back");
    const forward = stepAt(steps, "pump-forward");
    // The stroke ends on each step, which is when its sound is heard.
    const pump = play<number>([[back - 0.09, 0], [back, 1, "out"], [forward - 0.08, 1], [forward, 0, "in"]], shot.since);
    const support = { ...pose.support, pos: add(pose.support.pos, [0, 0, pump * TRAVEL.shotgun.pump]) };
    return { ...pose, pump, carrier: pump, support };
  }
  const home = Math.max(SEEN_BACK, stepAt(steps, "bolt-forward"));
  const cycling = 1 - span(shot.since, home, home + SEEN_HOME - SEEN_BACK, "in");
  const held = holdsOpen(weapon) && shot.left === 0 ? 1 : 0;
  const carrier = Math.max(pose.carrier, cycling, held);
  // The AK's handle is part of its carrier; the others' handles stay put while firing.
  const handle = weapon === "ak47" ? Math.max(pose.handle, carrier) : pose.handle;
  const cover = weapon === "rifle" ? Math.max(pose.cover, span(shot.sinceFirst, 0, 0.05, "out")) : pose.cover;
  return { ...pose, carrier, handle, cover };
}
