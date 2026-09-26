import * as THREE from "three";
import type { Pose } from "../rig/pose";
import { BODY } from "../rig/skeleton";
import { emptyTorso, torsoFrame, wristFor, type TorsoFrame } from "../rig/torso-frame";

const ARM = BODY.upperArm + BODY.forearm;
/** The sword arm is kept a hair short of straight, so the elbow never locks with a snap. */
const COMFORT = 0.97;
/** On a two handed grip the free fist sits this far below the sword hand, toward the pommel. */
const SECOND_HAND = 0.105;

const torso = emptyTorso();
const wrist = new THREE.Vector3();
const reach = new THREE.Vector3();

/**
 * Leans the body into a reach. The blade is exactly where the engine put
 * it, so when the hand is further than the arm can go from where the
 * shoulder is, the body has to bring the shoulder closer: it tips toward
 * the hand, turns the sword shoulder into it and sinks for a low one, a
 * little at a time until the arm reaches.
 */
export function leanIntoReach(pose: Pose): void {
  for (let i = 0; i < 4; i++) {
    torsoFrame(pose, torso);
    wristFor(pose.hand, pose.blade, torso.shoulderR, wrist);
    reach.copy(wrist).sub(torso.shoulderR);
    const excess = reach.length() - ARM * COMFORT;
    if (excess <= 0) return;
    reach.normalize();
    pose.lean += Math.max(-0.2, Math.min(0.35, (excess * reach.x) / 0.45));
    pose.twist += Math.max(-0.2, Math.min(0.35, (excess * reach.x) / 0.3));
    pose.tilt += Math.max(-0.2, Math.min(0.2, (excess * reach.z) / 0.45));
    pose.hips.y -= excess * Math.max(0, -reach.y) * 0.7;
    pose.hips.x += excess * reach.x * 0.25;
  }
}

/** The free hand's two places: on the grip, or held in its own guard. */
export interface OffHand {
  /** Where the second fist would go on the grip. */
  grip: THREE.Vector3;
  /** Whether the free arm can reach it from here. */
  canGrip: boolean;
  free: THREE.Vector3;
}

/**
 * Where the free hand can be. On a two handed grip it closes round the
 * grip below the sword hand whenever it can reach; when a swing carries
 * the grip out of its reach it lets go and comes back to guard: a fist
 * in front of the chest, or held out wide for balance with a one handed
 * sword.
 */
export function offHandPlaces(pose: Pose, twoHanded: boolean, out: OffHand, frame: TorsoFrame = torsoFrame(pose, torso)): OffHand {
  out.grip.copy(pose.grip).addScaledVector(pose.blade, -SECOND_HAND);
  wristFor(out.grip, pose.blade, frame.shoulderL, wrist);
  out.canGrip = twoHanded && pose.holding && wrist.distanceTo(frame.shoulderL) < ARM * 0.95;
  if (twoHanded) {
    out.free.copy(frame.shoulderL).addScaledVector(frame.front, 0.24).addScaledVector(frame.up, -0.3).addScaledVector(frame.side, 0.1);
  } else {
    out.free.copy(frame.shoulderL).addScaledVector(frame.front, 0.02).addScaledVector(frame.up, -0.38).addScaledVector(frame.side, -0.2);
  }
  return out;
}
