import type { Move } from "../../engine/moves";
import { CHANNELS, keyed, type Pose, type PosePatch } from "./pose";

/** The part of the body a swing's trail follows. */
export type TrailAnchor = "handR" | "handL" | "ankleR" | "ankleL" | "tip" | "none";

/**
 * One move's animation, written against the move's own frame data: the
 * wind up is reached just before the first hitbox comes out, the hit
 * pose is held while the hitboxes are live, then the fighter settles
 * back. So the body and the damage always agree, whatever the timing.
 */
export interface StrikeAnim {
  windup: PosePatch;
  hit: PosePatch;
  /** Every other hit of a flurry uses this pose instead. */
  alt?: PosePatch;
  /** The last hit of a flurry of three or more. */
  finisher?: PosePatch;
  /** Whole somersaults and spins through the live frames. Negative flips go backward. */
  flip?: number;
  spin?: number;
  /** Explicit keys by frame, for the long ults. They replace the windup and hit keys. */
  keys?: readonly (readonly [number, PosePatch])[];
  trail?: TrailAnchor;
}

export interface Timing {
  /** First and last live frame, and the start of each hit in a flurry. */
  from: number;
  to: number;
  hits: number[];
}

const timings = new WeakMap<Move, Timing>();

/** When a move's hits are live, from its hitboxes or the frame it throws a projectile. */
export function timing(move: Move): Timing {
  let t = timings.get(move);
  if (!t) timings.set(move, (t = measure(move)));
  return t;
}

function measure(move: Move): Timing {
  const starts = new Map<number, number>();
  let from = Infinity;
  let to = -Infinity;
  for (const b of move.hitboxes) {
    from = Math.min(from, b.from);
    to = Math.max(to, b.to);
    const g = b.group ?? 0;
    starts.set(g, Math.min(starts.get(g) ?? Infinity, b.from));
  }
  for (const p of move.projectiles ?? []) {
    from = Math.min(from, p.frame);
    to = Math.max(to, p.frame + 3);
    if (!move.hitboxes.length) starts.set(-1, p.frame);
  }
  if (!Number.isFinite(from)) {
    from = Math.round(move.frames / 3);
    to = from + 3;
  }
  return { from, to, hits: [...starts.values()].sort((a, b) => a - b) };
}

/** The pose `frame` frames into a move, over a base pose. */
export function strikePose(anim: StrikeAnim, move: Move, frame: number, base: Pose): Pose {
  const t = timing(move);
  const keys = anim.keys ? [...anim.keys] : strikeKeys(anim, t);
  // Settle back to the base by the end, setting every channel the move touched.
  const back: PosePatch = {};
  for (const [, patch] of keys) for (const c of CHANNELS) if (patch[c] !== undefined) back[c] = base[c];
  keys.push([Math.max(keys[keys.length - 1]![0] + 1, move.frames - 2), back]);
  const pose = keyed(keys, frame, base);
  const u = Math.max(0, Math.min(1, (frame - t.from + 1) / Math.max(1, t.to - t.from + 2)));
  const eased = u * u * (3 - 2 * u);
  if (anim.flip) pose.flip = eased * anim.flip * Math.PI * 2;
  if (anim.spin) pose.spin = eased * anim.spin * Math.PI * 2;
  return pose;
}

function strikeKeys(anim: StrikeAnim, t: Timing): [number, PosePatch][] {
  const keys: [number, PosePatch][] = [[0, {}], [Math.max(1, t.from - 1), anim.windup]];
  const hits = t.hits.length > 1 ? t.hits : [t.from];
  hits.forEach((start, i) => {
    const last = i === hits.length - 1 && hits.length > 2;
    const pose = last && anim.finisher ? anim.finisher : i % 2 === 1 && anim.alt ? anim.alt : anim.hit;
    keys.push([start + 1, pose]);
  });
  keys.push([t.to + 1, {}]);
  return keys;
}
