import type * as THREE from "three";

/**
 * Where hair grows on the head, in the head's own units: the hairline
 * runs across the forehead, recedes a touch at the temples, drops in
 * front of each ear as a sideburn, passes over the ears and sweeps down
 * the back to the nape.
 */

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The hairline's height at azimuth `phi` (0 at the front, ±π at the back). `low` lowers it at the front, for a fringe. */
export function lineAt(phi: number, low = 0): number {
  const a = Math.abs(phi);
  const front = 0.074 - low;
  const side = 0.034;
  const nape = -0.068;
  let y = a <= Math.PI / 2 ? front + (side - front) * smooth(a / (Math.PI / 2)) : side + (nape - side) * smooth((a - Math.PI / 2) / (Math.PI / 2)) ** 0.8;
  // Recessed at the temples, so the line across the forehead curves rather than cutting straight; down in front of the ears for the sideburns.
  y += 0.014 * bell(a, 0.6, 0.2) - 0.004 * bell(a, 0, 0.12);
  y = Math.min(y, -0.004 + 0.045 * (1 - bell(a, 1.3, 0.12)));
  return y;
}

export const azimuth = (dir: THREE.Vector3) => Math.atan2(dir.x, dir.z);

/** How far above the hairline a spot on the head is, in metres; negative is bare skin. */
export function aboveLine(base: THREE.Vector3, dir: THREE.Vector3, low = 0): number {
  return base.y - lineAt(azimuth(dir), low);
}

/** The top of the head, 0 at the hairline's height on the sides and 1 on the crown: where a crop is left long. */
export function crown(base: THREE.Vector3, dir: THREE.Vector3): number {
  const a = Math.abs(azimuth(dir));
  // The long part over the top reaches further down at the front than at the back.
  const edge = 0.075 + 0.015 * smooth((a - 1) / 1.5);
  return smooth((base.y - edge) / 0.02);
}
