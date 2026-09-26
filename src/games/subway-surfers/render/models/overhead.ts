import { RUNNER } from "../../engine/tuning";

/**
 * What hangs over the tracks, as plain numbers, so the camera can keep
 * clear of it and tests can check the view from a train roof.
 */

/** Where the tunnel vault springs from the walls, and its half width. */
export const VAULT_SPRING = 7;
export const VAULT_HALF = 5.5;
/** The crown of the vault. High enough that a runner on a jetpack flies under it and its ribs. */
export const TUNNEL_TOP = 9.8;
/** The ribs across the vault hang this far below the crown, glow strip and all. */
export const RIB_DROP = 0.5;

/** The vault's height over a point `x` metres from the middle of the tracks. */
export function vaultHeightAt(x: number): number {
  const u = Math.min(1, Math.abs(x) / VAULT_HALF);
  return VAULT_SPRING + (TUNNEL_TOP - VAULT_SPRING) * Math.sqrt(1 - u * u);
}

/** The lowest thing over a point inside a tunnel: the vault, or a rib under it. */
export function tunnelCeilingAt(x: number): number {
  return Math.min(vaultHeightAt(x), TUNNEL_TOP - RIB_DROP);
}

/** Something hanging over the tracks: from `far` to `near` along z (the camera is at larger z), from `low` to `high` up. */
export interface Overhang {
  near: number;
  far: number;
  low: number;
  high: number;
}

/** A signal gantry's frame and signal heads, from their beam down. See gantry() in track.ts. */
export const GANTRY = { depth: 0.4, low: 5.5, high: 7.1 };
/** The contact wires, running a whole chunk over each track. See wires() in track.ts. */
export const WIRES = { low: 5.85, high: 6.55 };

/** Where a runner's head is, for the line from the camera to them. */
export const headAbove = (y: number) => y + RUNNER.height;

/**
 * Whether something overhead gets in the way of the view: across the
 * line from the camera to the runner's head, or right at the lens.
 * Heights in metres and z along the track, where the camera sits behind
 * the runner at a larger z.
 */
export function blocksView(o: Overhang, eye: { y: number; z: number }, head: { y: number; z: number }, pad = 0.5): boolean {
  const low = o.low - pad;
  const high = o.high + pad;
  // Something the lens is passing through fills the picture.
  if (eye.z > o.far - 2 && eye.z < o.near + 2 && eye.y > low && eye.y < high) return true;
  const from = Math.max(o.far, head.z - 0.5);
  const to = Math.min(o.near, eye.z);
  if (from > to) return false;
  const at = (z: number) => {
    const t = eye.z === head.z ? 0 : Math.max(0, Math.min(1, (z - head.z) / (eye.z - head.z)));
    return head.y + (eye.y - head.y) * t;
  };
  // The line is straight, so its lowest and highest points over the stretch are at the ends.
  const a = at(from);
  const b = at(to);
  return Math.max(a, b) > low && Math.min(a, b) < high;
}
