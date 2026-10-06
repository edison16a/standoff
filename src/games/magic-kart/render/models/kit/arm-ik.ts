import * as THREE from "three";

const axis = new THREE.Vector3();
const side = new THREE.Vector3();

/**
 * Two bone reach: where the elbow goes so a shoulder and a wrist `upper`
 * and `fore` apart are joined, bending toward `pole`. A wrist out of
 * reach is pulled in along the line, so the arm straightens instead of
 * coming apart. Writes the elbow into `out` and returns the wrist it
 * actually reaches.
 */
export function solveElbow(
  shoulder: THREE.Vector3,
  wrist: THREE.Vector3,
  upper: number,
  fore: number,
  pole: THREE.Vector3,
  out: THREE.Vector3,
): THREE.Vector3 {
  axis.copy(wrist).sub(shoulder);
  const raw = axis.length();
  const d = Math.min(upper + fore - 1e-4, Math.max(Math.abs(upper - fore) + 1e-4, raw));
  if (raw < 1e-6) axis.set(0, -1, 0);
  else axis.divideScalar(raw);
  // Law of cosines: how far along the shoulder to wrist line the elbow sits, and how far off it.
  const along = (upper * upper - fore * fore + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, upper * upper - along * along));
  side.copy(pole).addScaledVector(axis, -pole.dot(axis));
  if (side.lengthSq() < 1e-8) side.set(0, -1, 0).addScaledVector(axis, axis.y);
  side.normalize();
  out.copy(shoulder).addScaledVector(axis, along).addScaledVector(side, off);
  return wrist.clone().copy(shoulder).addScaledVector(axis, d);
}
