import * as THREE from "three";
import { reach } from "./reach";
import type { Survivor } from "./survivor";

export type Stance = "stand" | "kneel";

export interface Aim {
  stance: Stance;
  /** Turn of the body, in radians, 0 facing +z. */
  yaw: number;
  /** Tilt of the gun, up positive. */
  pitch: number;
  /** 0 to 1, the kick of the latest shot. */
  kick: number;
  /** Seconds, for the sway of a body riding in a truck. */
  time: number;
}

const grip = new THREE.Vector3();
const guard = new THREE.Vector3();
const pole = new THREE.Vector3();
const facing = new THREE.Quaternion();
const spineQ = new THREE.Quaternion();
const tilt = new THREE.Quaternion();
const euler = new THREE.Euler();

/**
 * Poses one of the team shouldering a gun: planted feet or down on one
 * knee, the stock at the right shoulder, the head down on the sights,
 * and both hands put on the gun with a two bone reach, so the arms
 * follow wherever the gun points and kicks.
 */
export function poseSurvivor(who: Survivor, aim: Aim): void {
  const { rig, gun } = who;
  const b = rig.bones;
  const d = rig.dims;
  const sway = Math.sin(aim.time * 2.3 + who.seat) * 0.03;
  for (const bone of Object.values(b)) bone.rotation.set(0, 0, 0);
  rig.root.rotation.y = aim.yaw;

  if (aim.stance === "kneel") {
    b.hips.position.y = d.shin + d.foot + 0.02;
    b.hipL.rotation.set(-1.45, 0, 0.12);
    b.kneeL.rotation.x = 1.5;
    b.ankleL.rotation.x = -0.05;
    b.hipR.rotation.set(0.15, 0, -0.1);
    b.kneeR.rotation.x = 1.45;
    b.ankleR.rotation.x = 0.5;
  } else {
    b.hips.position.y = d.thigh + d.shin + d.foot - 0.06;
    b.hipL.rotation.set(-0.28, 0, 0.1);
    b.kneeL.rotation.x = 0.36;
    b.ankleL.rotation.x = -0.08;
    b.hipR.rotation.set(0.22, 0, -0.12);
    b.kneeR.rotation.x = 0.2;
    b.ankleR.rotation.x = -0.4;
  }
  // Leaning into the gun, turned a little to bring the right shoulder behind it.
  b.hips.rotation.y = -0.25;
  b.spine.rotation.set(0.12 + sway - aim.kick * 0.12, 0.3, 0.02);
  b.neck.rotation.set(0.1 - aim.pitch * 0.5, -0.2, 0);
  b.head.rotation.set(0.12, -0.12, 0.18);

  // The gun sits against the right shoulder, pointing the way the body faces.
  const kickBack = aim.kick * 0.07;
  gun.root.position.set(-0.13, d.torso * 0.78 + aim.kick * 0.02, 0.3 - kickBack);
  rig.root.updateMatrixWorld(true);
  // Set in the world, so the gun points where the body faces whatever the spine's turn.
  rig.root.getWorldQuaternion(facing);
  gun.root.quaternion
    .copy(b.spine.getWorldQuaternion(spineQ).invert())
    .multiply(facing)
    .multiply(tilt.setFromEuler(euler.set(aim.pitch + aim.kick * 0.25, Math.PI, 0, "YXZ")));
  gun.root.updateMatrixWorld(true);
  // Right hand on the grip, left hand out on the fore end, elbows down and out.
  gun.root.localToWorld(grip.set(0, -0.05, 0.03));
  gun.root.localToWorld(guard.set(0, -0.03, -0.36));
  const right = pole.set(-1, -1.4, 0).applyQuaternion(facing);
  reach(b.shoulderR, b.elbowR, d.upperArm, d.forearm + d.hand * 0.4, grip, right);
  const left = pole.set(1, -1.2, 0.2).applyQuaternion(facing);
  reach(b.shoulderL, b.elbowL, d.upperArm, d.forearm + d.hand * 0.4, guard, left);
}
