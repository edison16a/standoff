import * as THREE from "three";

export interface TwoBone {
  /** Where the middle joint goes: the elbow or the knee. */
  middle: THREE.Vector3;
  /** Where the end lands, which is the target unless it was out of reach. */
  end: THREE.Vector3;
}

const toTarget = new THREE.Vector3();
const toPole = new THREE.Vector3();
const side = new THREE.Vector3();

/**
 * Two bone inverse kinematics, as for an arm or a leg: from the root
 * joint, bones of length `upper` and `lower` reach for the target, and
 * the middle joint bends toward the pole. A target out of reach is
 * reached for in a straight line. A target too close is pushed out.
 */
export function solveTwoBone(root: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3, upper: number, lower: number): TwoBone {
  toTarget.subVectors(target, root);
  let reach = toTarget.length();
  const direction = reach > 1e-6 ? toTarget.clone().divideScalar(reach) : new THREE.Vector3(0, -1, 0);
  const longest = (upper + lower) * 0.9995;
  const shortest = Math.abs(upper - lower) + 0.02;
  reach = Math.min(longest, Math.max(shortest, reach));
  const end = root.clone().addScaledVector(direction, reach);

  // The law of cosines gives how far along the line the middle joint sits and how far off it.
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const off = Math.sqrt(Math.max(0, upper * upper - along * along));

  // The bend points toward the pole, square to the reach.
  toPole.subVectors(pole, root);
  side.copy(toPole).addScaledVector(direction, -toPole.dot(direction));
  if (side.lengthSq() < 1e-10) side.set(0, 0, 1).addScaledVector(direction, -direction.z);
  if (side.lengthSq() < 1e-10) side.set(1, 0, 0);
  side.normalize();
  const middle = root.clone().addScaledVector(direction, along).addScaledVector(side, off);
  return { middle, end };
}
