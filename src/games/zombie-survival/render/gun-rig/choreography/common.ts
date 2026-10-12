import type { ActionStep, TimedStep } from "../../../ballistics";
import { hand } from "../hands/grips";
import { jolt, span } from "../keyframes";
import { add, type GunPose, type HandPose, type V3 } from "../pose";

/** One reload as the choreography sees it. */
export interface ReloadInput {
  /** Seconds since the reload started. */
  t: number;
  /** The engine's length for the whole reload. */
  seconds: number;
  /** The gun ran dry, so the reload also chambers a round. */
  empty: boolean;
  /** The shared timeline, so the picture hits each step when the sound does. */
  steps: readonly TimedStep[];
  /** 1 when the gun sits right of centre, -1 on the left: it rolls toward the middle for all to see. */
  inward: number;
  /** Seconds since the gun last fired when the reload began, so a pump gun can finish its rack first. */
  sinceShot: number;
}

/** When a step falls in this reload. A step the timeline lacks reads as never. */
export function at(input: ReloadInput, step: ActionStep): number {
  return input.steps.find((s) => s.step === step)?.at ?? Infinity;
}

/** How far a gun comes up and over while reloading, at full lift. */
export interface Lift {
  /** Roll toward the middle of the screen, in radians. */
  roll: number;
  /** Muzzle up. */
  pitch: number;
  /** Up the screen, in metres. */
  raise: number;
}

/**
 * Lifts the gun and rolls it toward the middle by `amount` (0 to 1), so the
 * hands working the magazine or the loading port face the room. It stays
 * in its own lane across the screen, so its hands never reach into a
 * neighbour's. Then it adds any jolts, which pitch the muzzle and bump
 * the gun up: a magazine slapped home or a bolt slamming forward rocks the
 * whole gun.
 */
export function liftBody(pose: GunPose, amount: number, lift: Lift, inward: number, jolts: number): GunPose {
  const rot: V3 = [lift.pitch * amount + jolts * 0.035, 0, lift.roll * amount * inward];
  const pos: V3 = [0, lift.raise * amount + jolts * 0.004, -jolts * 0.004];
  return { ...pose, body: { pos: add(pose.body.pos, pos), rot: add(pose.body.rot, rot) } };
}

/** Up over the first moments, held, and back down from `down` to `end`. */
export function envelope(t: number, up: number, down: number, end: number): number {
  return span(t, 0, up) * (1 - span(t, down, end));
}

/** The sum of the jolts at these hits, each of a given strength. */
export function jolts(t: number, hits: readonly (readonly [at: number, strength: number])[]): number {
  return hits.reduce((sum, [when, strength]) => sum + jolt(t, when) * strength, 0);
}

/**
 * The left hand round a magazine: palm on its left face, fingers wrapped
 * round the front, thumb up toward the well. `pos` is where the palm
 * sits in the magazine's frame, since each magazine curves differently.
 */
export const holdMag = (pos: V3): HandPose => hand(pos, [1, 0, 0], [0, 0, -1], 0.88, 0.85, 0.55);

/** A flat palm under a magazine's base plate, for the slap that seats it. */
export const palmUnder = (pos: V3, tilt = 0): HandPose =>
  hand(pos, [0, Math.cos(tilt), Math.sin(tilt)], [0, Math.sin(tilt), -Math.cos(tilt)], 0.15, 0.1, 0.15);

/** Down by the belt, out of sight under the gun, where the fresh magazine comes from: an offset from home with its turn. */
export const FROM_POUCH: { pos: V3; rot: V3 } = { pos: [-0.06, -0.3, 0.1], rot: [0.5, 0, 0.4] };
