import * as THREE from "three";
import { part } from "../kit/part";
import { capsule, sphere, torus } from "../kit/shapes";
import type { Rig } from "../parts/driver-rig";
import { eyes } from "../parts/face";

const SKIN = "#45c75a";
const BELLY = "#d9f5a8";
const CAP = "#2c7be5";

/**
 * Pip's head: a wide frog face with big bulging eyes up top, a long grin,
 * rosy cheeks, and a backwards cap pulled on between the eyes.
 */
export function pipHead(rig: Rig): THREE.BufferGeometry[] {
  const h = rig.joints.head;
  const c = new THREE.Vector3(h.x, h.y + 0.22, h.z + 0.04);
  const at = (x: number, y: number, z: number): [number, number, number] => [c.x + x, c.y + y, c.z + z];
  const parts = [
    part(capsule(0.09, 0.06, 14), SKIN, { finish: "skin", at: [h.x, h.y + 0.06, h.z] }),
    part(sphere(0.25, 32, 22), SKIN, { finish: "skin", at: at(0, 0.02, 0), scale: [1.3, 0.76, 1.02] }),
    part(sphere(0.24, 28, 18), BELLY, { finish: "skin", at: at(0, -0.06, 0.05), scale: [1.18, 0.5, 0.96] }),
    // The long grin and a pink tongue tip.
    part(torus(0.2, 0.016, 32, 8, Math.PI * 0.9), "#7a1f2c", { finish: "skin", at: at(0, -0.02, 0.06), rot: [Math.PI / 2 + 0.25, 0, Math.PI * 1.05], scale: [1.15, 1, 1] }),
    part(sphere(0.045, 14, 10), "#ff7fa0", { finish: "skin", at: at(0.06, -0.07, 0.26), scale: [1.3, 0.5, 1] }),
    part(sphere(0.06, 14, 10), "#ff8fb0", { finish: "skin", at: at(0.25, -0.01, 0.17), scale: [1, 0.7, 0.5] }),
    part(sphere(0.06, 14, 10), "#ff8fb0", { finish: "skin", at: at(-0.25, -0.01, 0.17), scale: [1, 0.7, 0.5] }),
    part(sphere(0.014, 8, 6), "#1f5a28", { finish: "skin", at: at(0.04, 0.06, 0.25) }),
    part(sphere(0.014, 8, 6), "#1f5a28", { finish: "skin", at: at(-0.04, 0.06, 0.25) }),
    // Eye bulbs on top of the head, then the eyes in them.
    part(sphere(0.115, 22, 16), SKIN, { finish: "skin", at: at(0.15, 0.14, 0.06) }),
    part(sphere(0.115, 22, 16), SKIN, { finish: "skin", at: at(-0.15, 0.14, 0.06) }),
    ...eyes({ at: at(0, 0.165, 0.1), spread: 0.15, size: 0.09, iris: "#e0a11a", lid: SKIN, droop: 0.04, splay: 0.35 }),
    // A backwards cap between the eyes, its peak over the back of the neck.
    part(new THREE.SphereGeometry(0.17, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), CAP, { finish: "cloth", at: at(0, 0.13, -0.08), scale: [1.05, 0.8, 1.05], rot: [-0.25, 0, 0] }),
    part(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), CAP, { finish: "cloth", at: at(0, 0.1, -0.2), rot: [0.25, 0, 0], scale: [1, 1, 0.7] }),
    part(sphere(0.02, 8, 6), "#ffffff", { finish: "cloth", at: at(0, 0.27, -0.12) }),
  ];
  return parts;
}
