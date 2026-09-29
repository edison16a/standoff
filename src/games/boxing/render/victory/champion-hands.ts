import * as THREE from "three";
import type { Hand } from "../../engine/types";
import type { HandPose } from "../anim/hand-poses";
import { championFrame } from "./champion-pose";

/** Half the gap between the hands, matching the belt's grips either side of its plate. */
const GRIP = 0.3;
/** Wrist heights and reach against the model's root: at the chest, and locked out overhead. */
const CHEST = { y: 1.2, z: 0.36 };
const OVERHEAD = { y: 2.02, z: 0.1 };

/**
 * Where a champion's wrist goes, against the model's root, `t` seconds
 * into the ceremony: holding the belt out at the chest, then pressing it
 * up over the head with the elbows flaring out, then holding it high.
 */
export function championHand(hand: Hand, t: number): HandPose {
  const { lift, pump } = championFrame(t);
  const side = hand === "left" ? 1 : -1;
  const y = CHEST.y + (OVERHEAD.y - CHEST.y) * lift + 0.07 * pump;
  const z = CHEST.z + (OVERHEAD.z - CHEST.z) * Math.min(1, lift);
  return {
    target: new THREE.Vector3(side * GRIP, y, z),
    // Elbows point out and down at the chest, then out to the sides as the arms go up.
    pole: new THREE.Vector3(side * 0.95, 0.9 + 0.7 * Math.min(1, lift), -0.15),
  };
}
