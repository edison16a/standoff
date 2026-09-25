import * as THREE from "three";
import type { Hand } from "../../engine/types";

export interface Turn {
  /** Forward bend, positive leans forward. */
  pitch: number;
  /** Turn about the vertical, positive swings the right shoulder forward. */
  yaw: number;
  /** Side bend, positive tips toward the boxer's own left. */
  lean: number;
}

export interface Reach {
  /** Where the wrist goes, in the model's own space: +z forward, +x the boxer's left. */
  target: THREE.Vector3;
  /** Where the elbow points. */
  pole: THREE.Vector3;
}

export interface Plant {
  position: THREE.Vector3;
  /** Toes' direction about the vertical, in the model's space. */
  yaw: number;
}

/**
 * A whole body pose for one frame, as the animation layer wants it. The
 * rig turns it into joint rotations, reaching the hands and feet with
 * inverse kinematics.
 */
export interface RigPose {
  x: number;
  z: number;
  /** Facing about the vertical: 0 looks along +z. */
  yaw: number;
  hipHeight: number;
  hips: Turn;
  spine: Turn;
  chest: Turn;
  head: Turn;
  hands: Record<Hand, Reach>;
  feet: Record<Hand, Plant>;
  /** How far each wrist rolls the glove, 0 knuckles up to 1 knuckles turned in. */
  gloveRoll: Record<Hand, number>;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const turn = (): Turn => ({ pitch: 0, yaw: 0, lean: 0 });

/** A boxer in a plain orthodox stance, gloves up, as a starting point for every frame. */
export function stance(): RigPose {
  return {
    x: 0,
    z: 0,
    yaw: 0,
    hipHeight: 0.92,
    hips: { pitch: 0.05, yaw: -0.25, lean: 0 },
    spine: { pitch: 0.08, yaw: 0.05, lean: 0 },
    chest: { pitch: 0.06, yaw: 0.05, lean: 0 },
    head: { pitch: 0.12, yaw: 0.12, lean: 0 },
    hands: {
      left: { target: v(0.1, 1.5, 0.3), pole: v(0.5, 0.9, -0.2) },
      right: { target: v(-0.07, 1.47, 0.22), pole: v(-0.5, 0.9, -0.3) },
    },
    feet: {
      left: { position: v(0.13, 0.075, 0.2), yaw: 0.35 },
      right: { position: v(-0.15, 0.075, -0.2), yaw: 0.6 },
    },
    gloveRoll: { left: 0.4, right: 0.5 },
  };
}

export function copyPose(from: RigPose, to: RigPose): RigPose {
  to.x = from.x;
  to.z = from.z;
  to.yaw = from.yaw;
  to.hipHeight = from.hipHeight;
  for (const part of ["hips", "spine", "chest", "head"] as const) Object.assign(to[part], from[part]);
  for (const hand of ["left", "right"] as const) {
    to.hands[hand].target.copy(from.hands[hand].target);
    to.hands[hand].pole.copy(from.hands[hand].pole);
    to.feet[hand].position.copy(from.feet[hand].position);
    to.feet[hand].yaw = from.feet[hand].yaw;
    to.gloveRoll[hand] = from.gloveRoll[hand];
  }
  return to;
}

export { turn };
