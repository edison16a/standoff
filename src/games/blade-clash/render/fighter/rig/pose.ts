import * as THREE from "three";

/**
 * A whole body at one instant, in the fighter's own space: +x toward the
 * opponent, +y up, +z to the fighter's right, the sword side, with the
 * fighter's place on the line at the origin. The animator writes one of
 * these every frame and the rig turns it into bones.
 */
export interface Pose {
  /** The middle of the pelvis. */
  hips: THREE.Vector3;
  /** The hips turned about the vertical: positive brings the right hip forward. */
  hipsYaw: number;
  /** The spine tipped forward (positive) or back. */
  lean: number;
  /** The spine tipped toward the sword side (positive) or away. */
  tilt: number;
  /** The chest turned about the spine: positive brings the sword shoulder forward. */
  twist: number;
  /** The head, against the chest: nodding down (positive) and turning right (positive). */
  nod: number;
  turn: number;
  /** Ankles, and which way each foot's toes point about the vertical. */
  footR: THREE.Vector3;
  footL: THREE.Vector3;
  toeR: number;
  toeL: number;
  /** The sword: the middle of the grip, the blade's direction and the way its edge faces. */
  grip: THREE.Vector3;
  blade: THREE.Vector3;
  edge: THREE.Vector3;
  /** The sword hand's fist. On the grip while it holds the sword; a falling sword leaves it. */
  hand: THREE.Vector3;
  holding: boolean;
  /** Where the free hand's fist is, and how much it wraps the grip (0 free, 1 on the grip). */
  offHand: THREE.Vector3;
  offGrip: number;
}

export function emptyPose(): Pose {
  return {
    hips: new THREE.Vector3(0, 0.9, 0),
    hipsYaw: 0,
    lean: 0,
    tilt: 0,
    twist: 0,
    nod: 0,
    turn: 0,
    footR: new THREE.Vector3(0.2, 0.08, 0.13),
    footL: new THREE.Vector3(-0.22, 0.08, -0.13),
    toeR: 0,
    toeL: 0,
    grip: new THREE.Vector3(0.3, 1.3, 0.2),
    blade: new THREE.Vector3(0.8, 0.6, 0).normalize(),
    edge: new THREE.Vector3(-0.6, 0.8, 0),
    hand: new THREE.Vector3(0.3, 1.3, 0.2),
    holding: true,
    offHand: new THREE.Vector3(0.25, 1.15, -0.05),
    offGrip: 0,
  };
}
