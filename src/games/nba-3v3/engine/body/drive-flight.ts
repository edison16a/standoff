import { BOARD } from "../tuning";
import type { Athlete } from "../types";
import type { V2 } from "../vec";
import { BODY } from "./body-spec";
import { fallTime, heightAt, speedToMeet } from "./jump";

/**
 * The flight of a layup or a dunk under real gravity. The feet leave
 * the floor at the end of the gather with the speed that has the hand
 * at the rim exactly when the ball goes; from there the body is a
 * thrown object until a hang on the rim takes its weight or it lands.
 * Along the floor the last two steps slow the run, and once airborne
 * the body carries straight on at a steady speed.
 */

type Drive = Extract<Athlete["action"], { kind: "drive" }>;
type Timing = Pick<Drive, "takeoff" | "finish" | "rimHang" | "peak">;

/** Hanging on the rim, the arms take the weight and the body sinks a hand's length below the slam. */
export const HANG_DROP = 0.24;

const G = BODY.gravity;

/** The speed off the floor for this finish. */
export const liftOff = (d: Timing): number => speedToMeet(d.peak, d.finish - d.takeoff);

/** When the feet come back down, from the plan alone. */
export function landTime(d: Timing): number {
  if (d.rimHang > 0) return d.finish + d.rimHang + fallTime(d.peak - HANG_DROP, 0);
  return d.takeoff + (2 * liftOff(d)) / G;
}

/**
 * Feet off the floor through a drive: a free flight up to the slam,
 * then either the hang (the drop under the hands in the first quarter,
 * then still) and a fall from rest, or the rest of the free flight.
 */
export function driveHeight(d: Timing, t: number): number {
  if (t < d.takeoff) return 0;
  const v0 = liftOff(d);
  if (t < d.finish || d.rimHang <= 0) return heightAt(v0, t - d.takeoff);
  const onRim = d.peak - HANG_DROP;
  if (t < d.finish + d.rimHang) {
    const s = Math.min(1, ((t - d.finish) / d.rimHang) * 4);
    return d.peak + (onRim - d.peak) * s * s * (3 - 2 * s);
  }
  const fall = t - d.finish - d.rimHang;
  return Math.max(0, onRim - 0.5 * G * fall * fall);
}

/**
 * Where the body is along the drive at `t`. The gather comes in at
 * twice the flying speed and slows into the jump; in the air the speed
 * holds, so the body reaches the finish spot as the ball goes and drifts
 * on a little after a layup, never under the glass.
 */
export function drivePosition(d: Timing & Pick<Drive, "from" | "to">, t: number, out: V2): V2 {
  const dx = d.to.x - d.from.x;
  const dz = d.to.z - d.from.z;
  const len = Math.hypot(dx, dz);
  const g = d.takeoff;
  const air = Math.max(1e-3, d.finish - d.takeoff);
  const v = len / (1.5 * g + air);
  let s: number;
  if (t < g) s = 2 * v * t - (v * t * t) / (2 * g);
  else if (t < d.finish) s = 1.5 * v * g + v * (t - g);
  else s = len + drift(d, dz / Math.max(len, 1e-6), v, t);
  const k = len > 1e-6 ? s / len : 0;
  out.x = d.from.x + dx * k;
  out.z = d.from.z + dz * k;
  return out;
}

/** After a layup the body carries on a little, slowing, but stops short of the glass. */
function drift(d: Timing & Pick<Drive, "to">, uz: number, v: number, t: number): number {
  if (d.rimHang > 0) return 0;
  const on = Math.min(0.35, v * 0.6 * (t - d.finish));
  if (uz >= 0) return on;
  return Math.min(on, Math.max(0, (d.to.z - (BOARD.face + 0.35)) / -uz));
}
