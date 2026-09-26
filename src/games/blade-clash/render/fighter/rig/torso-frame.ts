import * as THREE from "three";
import { flatten } from "./ik";
import type { Pose } from "./pose";
import { BODY } from "./skeleton";

/** The chest's axes and the joints hung off it, worked out from a pose. */
export interface TorsoFrame {
  up: THREE.Vector3;
  front: THREE.Vector3;
  /** Toward the sword side. */
  side: THREE.Vector3;
  neck: THREE.Vector3;
  shoulderR: THREE.Vector3;
  shoulderL: THREE.Vector3;
}

export function emptyTorso(): TorsoFrame {
  return {
    up: new THREE.Vector3(),
    front: new THREE.Vector3(),
    side: new THREE.Vector3(),
    neck: new THREE.Vector3(),
    shoulderR: new THREE.Vector3(),
    shoulderL: new THREE.Vector3(),
  };
}

const facing = new THREE.Vector3();

/**
 * Where the chest points and where the shoulders are for a pose. The rig
 * builds the body from it, and the animator asks it how far the sword
 * hand is from the shoulder before it leans in to reach.
 */
export function torsoFrame(pose: Pose, out: TorsoFrame = emptyTorso()): TorsoFrame {
  const cosTilt = Math.cos(pose.tilt);
  out.up.set(Math.sin(pose.lean) * cosTilt, Math.cos(pose.lean) * cosTilt, Math.sin(pose.tilt)).normalize();
  facing.set(Math.cos(pose.twist), 0, -Math.sin(pose.twist));
  flatten(facing, out.up, out.front);
  out.side.crossVectors(out.front, out.up);
  out.neck.copy(pose.hips).addScaledVector(out.up, BODY.torso);
  out.shoulderR.copy(out.neck).addScaledVector(out.up, -BODY.shoulderDrop).addScaledVector(out.side, BODY.shoulderWidth / 2);
  out.shoulderL.copy(out.neck).addScaledVector(out.up, -BODY.shoulderDrop).addScaledVector(out.side, -BODY.shoulderWidth / 2);
  return out;
}

/**
 * Where the wrist goes for a fist at `fist` holding a grip along `along`.
 * The forearm meets the fist from the shoulder's side and a little behind
 * the grip, so the wrist sits between the two.
 */
export function wristFor(fist: THREE.Vector3, along: THREE.Vector3, shoulder: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.copy(fist).sub(shoulder).normalize().multiplyScalar(0.8).addScaledVector(along, 0.35);
  if (out.lengthSq() < 1e-8) out.copy(along);
  return out.normalize().multiplyScalar(-BODY.palm).add(fist);
}
