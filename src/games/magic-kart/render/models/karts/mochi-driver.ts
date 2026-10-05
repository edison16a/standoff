import * as THREE from "three";
import { part } from "../kit/part";
import { capsule, sphere, torus } from "../kit/shapes";
import type { Rig } from "../parts/driver-rig";
import { eyes } from "../parts/face";

const FUR = "#fbfbf8";
const INK = "#1e1a22";
const BAND = "#ff5c9a";

/**
 * Mochi's head: a big round panda face with black ears and eye patches,
 * a soft muzzle and button nose, rosy cheeks, and a pink headband tied in
 * a bow on one side.
 */
export function mochiHead(rig: Rig): THREE.BufferGeometry[] {
  const h = rig.joints.head;
  const c = new THREE.Vector3(h.x, h.y + 0.3, h.z + 0.02);
  const at = (x: number, y: number, z: number): [number, number, number] => [c.x + x, c.y + y, c.z + z];
  const parts = [
    part(capsule(0.1, 0.06, 14), FUR, { finish: "fur", at: [h.x, h.y + 0.06, h.z] }),
    part(sphere(0.29, 36, 26), FUR, { finish: "fur", at: at(0, 0, 0), scale: [1.08, 0.95, 0.98] }),
    part(sphere(0.1, 18, 14), INK, { finish: "fur", at: at(0.23, 0.22, -0.04), scale: [1, 1, 0.6] }),
    part(sphere(0.1, 18, 14), INK, { finish: "fur", at: at(-0.23, 0.22, -0.04), scale: [1, 1, 0.6] }),
    // Eye patches, tipped down at the outside like a panda's.
    part(sphere(0.085, 18, 14), INK, { finish: "fur", at: at(0.105, 0.02, 0.215), scale: [0.85, 1.2, 0.5], rot: [0, 0.35, 0.55] }),
    part(sphere(0.085, 18, 14), INK, { finish: "fur", at: at(-0.105, 0.02, 0.215), scale: [0.85, 1.2, 0.5], rot: [0, -0.35, -0.55] }),
    ...eyes({ at: at(0, 0.035, 0.235), spread: 0.105, size: 0.058, iris: "#6a4430", splay: 0.35 }),
    part(sphere(0.12, 20, 14), "#f3eee8", { finish: "fur", at: at(0, -0.09, 0.2), scale: [1.25, 0.78, 0.85] }),
    part(sphere(0.036, 14, 10), INK, { finish: "eye", at: at(0, -0.05, 0.3), scale: [1.45, 0.95, 1] }),
    part(torus(0.04, 0.007, 14, 6, Math.PI), INK, { finish: "skin", at: at(0, -0.12, 0.29), rot: [Math.PI / 2 + 0.4, 0, Math.PI] }),
    part(sphere(0.05, 14, 10), "#ffadc9", { finish: "fur", at: at(0.19, -0.07, 0.2), scale: [1, 0.65, 0.4] }),
    part(sphere(0.05, 14, 10), "#ffadc9", { finish: "fur", at: at(-0.19, -0.07, 0.2), scale: [1, 0.65, 0.4] }),
    // The headband and its bow.
    part(torus(0.278, 0.024, 44, 8), BAND, { finish: "cloth", at: at(0, 0.1, -0.02), rot: [Math.PI / 2 + 0.12, 0, 0], scale: [1.08, 0.98, 1] }),
    part(sphere(0.06, 14, 10), BAND, { finish: "cloth", at: at(0.27, 0.16, 0.08), scale: [1.3, 0.8, 0.5], rot: [0, 0.9, 0.6] }),
    part(sphere(0.06, 14, 10), BAND, { finish: "cloth", at: at(0.27, 0.06, 0.12), scale: [1.3, 0.8, 0.5], rot: [0, 0.9, -0.6] }),
    part(sphere(0.03, 10, 8), BAND, { finish: "cloth", at: at(0.29, 0.11, 0.1) }),
  ];
  return parts;
}
