import { lerp } from "./geometry";
import type { ArmSpec, PoseSpec } from "./synthetic";

/** One key in a scripted movement: this pose, this many milliseconds from the start. */
export interface PoseKey {
  at: number;
  pose: PoseSpec;
}

const NUMBERS = ["x", "height", "floor", "lift", "crouch", "bow", "lean", "visibility"] as const;
const ARM_NUMBERS = ["guard", "punch", "hook", "raise"] as const;

/** What a missing number means: standing tall in the middle, arms down. */
const DEFAULTS: Required<Pick<PoseSpec, (typeof NUMBERS)[number]>> = {
  x: 0.5,
  height: 0.7,
  floor: 0.95,
  lift: 0,
  crouch: 0,
  bow: 0,
  lean: 0,
  visibility: 0.98,
};

/**
 * The pose at time t, blending in a straight line between the keys
 * around it. Before the first key it holds the first, after the last it
 * holds the last. Keys must be in time order.
 */
export function poseAt(keys: readonly PoseKey[], t: number, base: PoseSpec = {}): PoseSpec {
  if (!keys.length) return base;
  let next = keys.findIndex((key) => key.at > t);
  if (next === -1) next = keys.length;
  const before = keys[Math.max(0, next - 1)]!;
  const after = keys[Math.min(keys.length - 1, next)]!;
  const span = after.at - before.at;
  const mix = span > 0 ? Math.min(1, Math.max(0, (t - before.at) / span)) : 0;
  return blendPoses({ ...base, ...before.pose }, { ...base, ...after.pose }, mix);
}

export function blendPoses(a: PoseSpec, b: PoseSpec, t: number): PoseSpec {
  const out: PoseSpec = {};
  for (const name of NUMBERS) out[name] = lerp(a[name] ?? DEFAULTS[name], b[name] ?? DEFAULTS[name], t);
  out.left = blendArms(a.left, b.left, t);
  out.right = blendArms(a.right, b.right, t);
  return out;
}

function blendArms(a: ArmSpec = {}, b: ArmSpec = {}, t: number): ArmSpec {
  const out: ArmSpec = {};
  for (const name of ARM_NUMBERS) out[name] = lerp(a[name] ?? 0, b[name] ?? 0, t);
  return out;
}

/** How long a timeline runs, in milliseconds. */
export function timelineLength(keys: readonly PoseKey[]): number {
  return keys.length ? keys[keys.length - 1]!.at : 0;
}

/**
 * Ready made moves for tests, each starting and ending standing still.
 * Pass the player's own spot so the move happens where they stand.
 */
export const MOVES = {
  jump: (base: PoseSpec = {}): PoseKey[] => [
    { at: 0, pose: base },
    { at: 180, pose: { ...base, lift: 0.28 } },
    { at: 420, pose: { ...base, lift: 0.28 } },
    { at: 600, pose: base },
  ],
  duck: (base: PoseSpec = {}, holdMs = 500): PoseKey[] => [
    { at: 0, pose: base },
    { at: 200, pose: { ...base, crouch: 0.6, bow: 0.3 } },
    { at: 200 + holdMs, pose: { ...base, crouch: 0.6, bow: 0.3 } },
    { at: 400 + holdMs, pose: base },
  ],
  step: (base: PoseSpec = {}, dx = 0.12): PoseKey[] => [
    { at: 0, pose: base },
    { at: 350, pose: { ...base, x: (base.x ?? 0.5) + dx } },
  ],
  punch: (base: PoseSpec = {}, hand: "left" | "right" = "right"): PoseKey[] => {
    const guard = { ...base, left: { guard: 1 }, right: { guard: 1 } };
    const out = { ...guard, [hand]: { guard: 1, punch: 1 } };
    return [
      { at: 0, pose: guard },
      { at: 120, pose: out },
      { at: 220, pose: out },
      { at: 420, pose: guard },
    ];
  },
};
