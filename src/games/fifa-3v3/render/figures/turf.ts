import * as THREE from "three";
import { LEFT, RIGHT, solveLeg, type Build } from "../anim/leg-ik";
import { applyPose, type Pose } from "../anim/pose";
import type { Rig } from "../models/body";

const v = new THREE.Vector3();

/** The boot's sole in the ankle's frame, over the body's scale: its underside, heel and toe (see models/body.ts). */
const SOLE = { y: -0.075, heel: -0.06, toe: 0.2 };

/** How far a flat boot stands into the grass, over the body's scale: its studs. */
const STUDS = 0.015;

/**
 * Keeps both boots out of the turf. Moves set by joint angles alone (a
 * slide, getting up, a celebration, the keeper's crouch) can bend a
 * leg down through the pitch. Such a leg is solved again to put its
 * ankle on the turf where it was, flat, so the knee bends up instead.
 * Returns whether it changed the pose, which it applies to the rig.
 */
export function keepAboveTurf(rig: Rig, pose: Pose, b: Build): boolean {
  rig.root.updateMatrixWorld(true);
  let changed = false;
  for (const side of [LEFT, RIGHT]) {
    const ankle = side === LEFT ? rig.ankleL : rig.ankleR;
    let low = Infinity;
    for (const z of [SOLE.heel, SOLE.toe]) low = Math.min(low, ankle.localToWorld(v.set(0, SOLE.y * b.s, z * b.s)).y);
    if (low > -STUDS * b.s - 0.01) continue;
    const at = rig.root.worldToLocal(ankle.getWorldPosition(v));
    solveLeg(pose, side, { x: at.x, y: Math.max(at.y, b.ground), z: at.z, toe: 0 }, b);
    changed = true;
  }
  if (changed) {
    applyPose(rig, pose);
    rig.root.updateMatrixWorld(true);
  }
  return changed;
}
