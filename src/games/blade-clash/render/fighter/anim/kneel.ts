import * as THREE from "three";
import type { Pose } from "../rig/pose";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Down on the free side's knee with the sword foot planted in front, in
 * the fighter's own space. The back shin lies along the floor with the
 * toes tucked under, so its ankle sits high enough for the toes to reach.
 */
const KNEEL = {
  hips: v(-0.08, 0.6, 0.02),
  footR: v(0.36, 0.08, 0.15),
  footL: v(-0.5, 0.2, -0.13),
  /** The sword fist rests on the front knee; the free arm hangs by the thigh. */
  hand: v(0.34, 0.62, 0.17),
  offHand: v(0.02, 0.6, -0.27),
};

/** The sword laid on the floor in front, flat side up, its tip across to the free side. */
const LAID = { grip: v(0.78, 0.03, 0.42), blade: v(0.18, 0, -1).normalize(), edge: v(1, 0, 0.18).normalize() };

/**
 * The loser's pose while the winner is crowned: on one knee, the sword
 * laid down in front, head bowed and shoulders heaving. It replaces the
 * whole living pose, since the ceremony cuts to it rather than blending.
 */
export function kneel(pose: Pose, ms: number): void {
  const breathe = Math.sin(ms / 650);
  pose.hips.copy(KNEEL.hips);
  pose.hips.y += 0.006 * breathe;
  pose.hipsYaw = 0.12;
  pose.lean = 0.3 + 0.03 * breathe;
  pose.tilt = 0.04;
  pose.twist = 0.08;
  pose.nod = 0.62 - 0.04 * breathe;
  pose.turn = 0.12;
  pose.footR.copy(KNEEL.footR);
  pose.footL.copy(KNEEL.footL);
  pose.toeR = 0.12;
  pose.toeL = -0.08;
  pose.grip.copy(LAID.grip);
  pose.blade.copy(LAID.blade);
  pose.edge.copy(LAID.edge);
  pose.holding = false;
  pose.hand.copy(KNEEL.hand);
  pose.offHand.copy(KNEEL.offHand);
  pose.offGrip = 0;
}
