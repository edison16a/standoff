import { arcTimed, arcTo, flight, type Flight } from "./flight";
import { between, type Rng } from "./rng";
import { aimShot } from "./shot-aim";
import type { Outcome } from "./shot-model";
import { scriptedShot } from "./shot-script";
import { RIM } from "./tuning";
import type { V3 } from "./vec";

export interface ShotPlanInput {
  from: V3;
  outcome: Outcome;
  /** How high the arc peaks, in metres. Jumpers go high, layups barely clear the rim. */
  apex: number;
  /** Backspin in radians per second: a jumper has lots, a layup a little. */
  backspin?: number;
}

export interface PlannedShot {
  flight: Flight;
  /** How it really goes, which can differ in style from the one asked for but never in or out. */
  outcome: Outcome;
}

/**
 * Plans a shot for an outcome already decided: flown on the real ball
 * physics when an aim for it can be found, which is nearly always, and
 * drawn as a scripted path otherwise.
 */
export function planShot(rng: Rng, input: ShotPlanInput): PlannedShot {
  const trace = aimShot(rng, { ...input, backspin: input.backspin ?? 14 });
  if (trace) return { flight: trace.flight, outcome: trace.outcome };
  return { flight: scriptedShot(rng, input), outcome: input.outcome };
}

/** A shot swatted just out of the hand: a blink toward the rim, then off the way the blocker hit it. */
export function planBlock(rng: Rng, from: V3, blocker: { x: number; z: number }): Flight {
  const tox = RIM.x - from.x;
  const toz = RIM.z - from.z;
  const d = Math.hypot(tox, toz) || 1;
  const hand = { x: from.x + (tox / d) * 0.3, y: from.y + 0.16, z: from.z + (toz / d) * 0.3 };
  const ax = hand.x - blocker.x;
  const az = hand.z - blocker.z;
  const ad = Math.hypot(ax, az) || 1;
  const speed = between(rng, 5, 8);
  const sideways = between(rng, -0.6, 0.6);
  const v = { x: (ax / ad + sideways * (az / ad)) * speed, y: between(rng, 0.8, 2.8), z: (az / ad - sideways * (ax / ad)) * speed };
  return flight([arcTimed(from, hand, 0.07)], { v, events: [{ kind: "block" }] });
}

/** A pass: flat and fast, or lobbed high over a defender in the lane. */
export function planPass(from: V3, to: V3, lob: boolean, speed: number): Flight {
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  if (lob) return flight([arcTo(from, to, Math.max(from.y, to.y) + 0.8 + d * 0.08)]);
  return flight([arcTimed(from, to, Math.max(0.12, d / speed))]);
}
