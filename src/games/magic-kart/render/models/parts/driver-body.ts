import * as THREE from "three";
import type { CharacterId } from "../../../characters";
import { emblemRegion } from "../kit/atlas-layout";
import { loft } from "../kit/loft";
import { part } from "../kit/part";
import { between, capsule, disc, rbox, sphere, torus, tube } from "../kit/shapes";
import { rigged, type Rig } from "./driver-rig";
import { gloves, steeringWheel } from "./steering";

export interface SuitLook {
  suit: string;
  /** Stripes, collar and cuffs. */
  trim: string;
  glove: string;
  boot: string;
  /** Chest and shoulders size, 1 is average. */
  build?: number;
  badge: CharacterId;
  /** The steering wheel's twelve o'clock marker. */
  wheelAccent: string;
  wheelRadius: number;
}

const limb = (a: THREE.Vector3, b: THREE.Vector3, r: number) =>
  between(capsule(r, Math.max(0.01, a.distanceTo(b)), 14), [a.x, a.y, a.z], [b.x, b.y, b.z]);

/**
 * Everything of a driver but the head, tied to the bones: legs and seat
 * in the cockpit, a racing suit with stripes, collar, belt and chest
 * badge, arms that the model bends to reach the wheel, and gloved hands
 * that turn with the wheel itself.
 */
export function driverBody(rig: Rig, look: SuitLook): THREE.BufferGeometry[] {
  const j = rig.joints;
  const b = look.build ?? 1;
  const wheelZ = j.wheel.z;
  const legs: THREE.BufferGeometry[] = [part(rbox(0.46 * b, 0.22, 0.4, 0.1), look.suit, { finish: "cloth", at: [0, 0.06, 0.02] })];
  for (const side of [1, -1]) {
    const hip = new THREE.Vector3(side * 0.13, 0.06, 0.08);
    // Knees up under the wheel, feet down in the footwell, out of sight under the cowl.
    const knee = new THREE.Vector3(side * 0.16, 0.2, Math.max(0.34, wheelZ * 0.7));
    const ankle = new THREE.Vector3(side * 0.15, -0.14, wheelZ + 0.24);
    legs.push(part(limb(hip, knee, 0.085), look.suit, { finish: "cloth" }));
    legs.push(part(limb(knee, ankle, 0.07), look.suit, { finish: "cloth" }));
    legs.push(part(rbox(0.13, 0.12, 0.24, 0.05), look.boot, { finish: "leather", at: [ankle.x, ankle.y, ankle.z + 0.07] }));
  }
  const top = j.upperL.y;
  // The torso, lofted from waist to shoulders so it reads as a body, not a box.
  const torso = loft([
    { z: 0.02, w: 0.42 * b, y0: -0.15, y1: 0.14, n: 2.6 },
    { z: top * 0.45, w: 0.44 * b, y0: -0.17, y1: 0.15, n: 2.8 },
    { z: top * 0.85, w: 0.54 * b, y0: -0.17, y1: 0.15, n: 3 },
    { z: top + 0.06, w: 0.4 * b, y0: -0.13, y1: 0.12, n: 2.6 },
    { z: top + 0.1, w: 0.18, y0: -0.07, y1: 0.07, n: 2 },
  ], { around: 28, along: 22 }).rotateX(-Math.PI / 2);
  const spine = [
    part(torso, look.suit, { finish: "cloth", at: [0, 0, -0.02] }),
    part(tube(0.11, 0.12, 0.06, 24), look.trim, { finish: "cloth", at: [0, top + 0.08, -0.02] }),
    part(torus(0.215 * b, 0.025, 32, 8), "#24242a", { finish: "leather", at: [0, 0.16, -0.02], rot: [Math.PI / 2, 0, 0], scale: [1, 0.72, 1] }),
    part(rbox(0.09, 0.06, 0.03, 0.01), "#e8e8ee", { finish: "chrome", at: [0, 0.16, 0.13] }),
    part(rbox(0.012, top * 0.6, 0.012, 0.005), "#1c1c22", { finish: "plastic", at: [0, top * 0.62, 0.15], rot: [-0.08, 0, 0] }),
    part(disc(0.06, 24), "#ffffff", { finish: "paint", region: emblemRegion(look.badge), at: [0.11 * b, top * 0.72, 0.165], rot: [-0.12, 0.25, 0] }),
  ];
  for (const side of [1, -1]) {
    const shoulder = side > 0 ? j.upperL : j.upperR;
    spine.push(part(sphere(0.085 * b, 18, 14), look.suit, { finish: "cloth", at: [shoulder.x, shoulder.y, shoulder.z] }));
    // Racing stripes down each side of the suit.
    spine.push(part(capsule(0.018, top * 0.6, 8), look.trim, { finish: "cloth", at: [side * 0.235 * b, top * 0.5, -0.02] }));
  }
  const arms: THREE.BufferGeometry[] = [];
  for (const [upperBone, foreBone, side] of [["upperL", "foreL", 1], ["upperR", "foreR", -1]] as const) {
    const shoulder = j[upperBone];
    const elbow = j[foreBone];
    const wrist = side > 0 ? rig.wrists.L : rig.wrists.R;
    arms.push(...rigged([part(limb(shoulder, elbow, 0.066), look.suit, { finish: "cloth" })], upperBone));
    arms.push(
      ...rigged([
        part(sphere(0.07, 16, 12), look.suit, { finish: "cloth", at: [elbow.x, elbow.y, elbow.z] }),
        part(limb(elbow, wrist.clone().lerp(elbow, 0.12), 0.058), look.suit, { finish: "cloth" }),
        part(limb(elbow.clone().lerp(wrist, 0.45), elbow.clone().lerp(wrist, 0.5), 0.062), look.trim, { finish: "cloth" }),
      ], foreBone),
    );
  }
  return [
    ...rigged(legs, "root"),
    ...rigged(spine, "spine"),
    ...arms,
    ...rigged([...gloves(rig, { glove: look.glove, cuff: look.trim }), ...steeringWheel(rig, look.wheelRadius, look.wheelAccent, look.badge)], "wheel"),
  ];
}
