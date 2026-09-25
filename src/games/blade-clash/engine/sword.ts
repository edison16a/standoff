import type { BladeSpec } from "@/games/blade-clash/characters";
import { clamp, cross, dot, scale, sub, wrapAngle } from "@/games/kit/motion/math3d";
import { add, normalize, type Vec3 } from "./geometry";

/**
 * How the player holds the sword, as the phone reports it, in the
 * fighter's own frame. Yaw turns the blade to the fighter's right, pitch
 * raises it, roll turns the edge around the blade, and reach (0 to 1)
 * is how far the arm is stretched toward the opponent.
 */
export interface SwordControl {
  yaw: number;
  pitch: number;
  roll: number;
  reach: number;
}

/** Past these the arm cannot follow, however the phone is held. */
export const YAW_LIMIT = 1.75;
export const PITCH_MIN = -1.3;
export const PITCH_MAX = 1.45;

/** A relaxed guard: tip up and a little right, arm bent. Where the computer rests and where a new fight starts. */
export const GUARD: SwordControl = { yaw: 0.12, pitch: 0.5, roll: 0, reach: 0 };

/** The sword in the world: the hand, the blade from its root to its tip, and which way the edge faces. */
export interface SwordPose {
  hand: Vec3;
  /** Where the blade leaves the guard. Hits count from here to the tip. */
  base: Vec3;
  tip: Vec3;
  /** Unit vector from the hand along the blade. */
  dir: Vec3;
  /** Unit vector across the blade, the way the edge faces. */
  edge: Vec3;
}

/** From the hand to where the blade starts: the grip and the guard. */
const HILT = 0.1;

export function clampControl(control: SwordControl): SwordControl {
  return {
    yaw: clamp(control.yaw, -YAW_LIMIT, YAW_LIMIT),
    pitch: clamp(control.pitch, PITCH_MIN, PITCH_MAX),
    roll: wrapAngle(control.roll),
    reach: clamp(control.reach, 0, 1),
  };
}

/** Part way from one hold to another. Roll goes the short way round. */
export function blendControl(a: SwordControl, b: SwordControl, k: number): SwordControl {
  return {
    yaw: a.yaw + (b.yaw - a.yaw) * k,
    pitch: a.pitch + (b.pitch - a.pitch) * k,
    roll: wrapAngle(a.roll + wrapAngle(b.roll - a.roll) * k),
    reach: a.reach + (b.reach - a.reach) * k,
  };
}

/** The blade's direction in the fighter's frame: forward, up and right parts. */
export function bladeDirection(control: SwordControl): { f: number; u: number; r: number } {
  const cosPitch = Math.cos(control.pitch);
  return { f: cosPitch * Math.cos(control.yaw), u: Math.sin(control.pitch), r: cosPitch * Math.sin(control.yaw) };
}

/**
 * Where the sword hand sits for a hold, in the fighter's frame. It moves
 * the way a real arm does: a raised blade lifts the hand toward the head,
 * a low one drops it to the hip, a blade swung across the body carries the
 * hand across, and reaching stretches the arm out toward the opponent.
 */
export function handFor(control: SwordControl): { f: number; u: number; r: number } {
  const d = bladeDirection(control);
  const reach = clamp(control.reach, 0, 1);
  return {
    f: 0.2 + 0.15 * Math.max(0, d.f) + 0.35 * reach,
    u: 1.1 + (d.u > 0 ? 0.45 : 0.25) * d.u + 0.1 * reach,
    r: 0.18 + 0.3 * d.r,
  };
}

/**
 * The sword in the world for a fighter standing at `x` and facing along
 * `facing`, which is all a hit test needs. A pure function, so the swept
 * tests can ask for the blade at any moment between two ticks.
 */
export function swordPose(x: number, facing: 1 | -1, control: SwordControl, blade: BladeSpec): SwordPose {
  const toWorld = (v: { f: number; u: number; r: number }): Vec3 => ({ x: v.f * facing, y: v.u, z: v.r * facing });
  const hand = add({ x, y: 0, z: 0 }, toWorld(handFor(control)));
  const dir = toWorld(bladeDirection(control));
  return {
    hand,
    base: add(hand, scale(dir, HILT)),
    tip: add(hand, scale(dir, blade.length)),
    dir,
    edge: edgeFor(dir, control.roll),
  };
}

/** Level edge turned by the roll around the blade. */
function edgeFor(dir: Vec3, roll: number): Vec3 {
  const up = { x: 0, y: 1, z: 0 };
  const flat = sub(up, scale(dir, dot(up, dir)));
  const ref = Math.hypot(flat.x, flat.y, flat.z) > 1e-4 ? normalize(flat) : { x: 1, y: 0, z: 0 };
  const side = cross(dir, ref);
  return normalize(add(scale(ref, Math.cos(roll)), scale(side, Math.sin(roll))));
}
