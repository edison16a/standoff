import * as THREE from "three";
import { part } from "../kit/part";
import { capsule, lathe, sphere, torus, tube } from "../kit/shapes";
import type { Rig } from "../parts/driver-rig";
import { eyes } from "../parts/face";

const FUR = "#ff7a26";
const CREAM = "#fff1e2";
const HELMET = "#d42a14";
const GOLD = "#ffc21a";

/**
 * Blaze's head: a fox with a long muzzle, white cheek ruffs and tall
 * black tipped ears poking through an open face racing helmet, with
 * amber goggles pushed up on its brow.
 */
export function blazeHead(rig: Rig): THREE.BufferGeometry[] {
  const h = rig.joints.head;
  const c = new THREE.Vector3(h.x, h.y + 0.3, h.z + 0.02);
  const at = (x: number, y: number, z: number): [number, number, number] => [c.x + x, c.y + y, c.z + z];
  const parts = [
    part(capsule(0.075, 0.1, 14), FUR, { finish: "fur", at: [h.x, h.y + 0.08, h.z] }),
    part(sphere(0.235, 32, 24), FUR, { finish: "fur", at: at(0, 0, 0), scale: [1.02, 0.95, 1] }),
    // White cheek ruffs and chin.
    part(sphere(0.13, 20, 14), CREAM, { finish: "fur", at: at(0.13, -0.1, 0.1), scale: [1, 0.75, 0.9], rot: [0, 0, -0.4] }),
    part(sphere(0.13, 20, 14), CREAM, { finish: "fur", at: at(-0.13, -0.1, 0.1), scale: [1, 0.75, 0.9], rot: [0, 0, 0.4] }),
    // The muzzle, orange on top and cream underneath, and a glossy black nose.
    part(lathe([[0.001, 0], [0.1, 0.03], [0.085, 0.12], [0.045, 0.22], [0.001, 0.25]], 24), FUR, { finish: "fur", at: at(0, -0.04, 0.14), rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8] }),
    part(sphere(0.075, 18, 12), CREAM, { finish: "fur", at: at(0, -0.1, 0.22), scale: [1, 0.55, 1.2] }),
    part(sphere(0.042, 16, 12), "#141418", { finish: "eye", at: at(0, -0.02, 0.4), scale: [1.2, 0.9, 1] }),
    part(torus(0.05, 0.008, 12, 6, Math.PI), "#3a1a10", { finish: "skin", at: at(0, -0.12, 0.3), rot: [Math.PI / 2 + 0.3, 0, Math.PI] }),
    ...eyes({ at: at(0, 0.05, 0.165), spread: 0.1, size: 0.078, iris: "#3fae2a", lid: FUR, droop: 0.12, splay: 0.3 }),
    // Brows, angled for a cocky look.
    part(capsule(0.014, 0.07, 8), "#a83c10", { finish: "fur", at: at(0.09, 0.14, 0.2), rot: [0, 0, 1.2] }),
    part(capsule(0.014, 0.07, 8), "#a83c10", { finish: "fur", at: at(-0.09, 0.14, 0.2), rot: [0, 0, -1.2] }),
    // An open face helmet: a glossy shell over the crown and back, with a gold stripe.
    part(new THREE.SphereGeometry(0.255, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), HELMET, { finish: "metallic", at: at(0, 0.01, -0.03), rot: [-0.55, 0, 0] }),
    part(torus(0.257, 0.02, 32, 8, Math.PI * 0.62), GOLD, { finish: "metallic", at: at(0, 0.01, -0.03), rot: [0, Math.PI / 2, Math.PI * 0.12] }),
  ];
  for (const side of [-1, 1]) {
    // Tall ears through the helmet: orange outside, cream inside, black tips.
    parts.push(part(lathe([[0.075, 0], [0.06, 0.1], [0.025, 0.19], [0.001, 0.22]], 16), FUR, { finish: "fur", at: at(side * 0.13, 0.17, -0.05), rot: [-0.15, 0, side * -0.4], scale: [1, 1, 0.55] }));
    parts.push(part(lathe([[0.055, 0], [0.04, 0.09], [0.001, 0.17]], 12), CREAM, { finish: "fur", at: at(side * 0.135, 0.18, -0.03), rot: [-0.15, 0, side * -0.4], scale: [1, 1, 0.4] }));
    parts.push(part(lathe([[0.03, 0], [0.014, 0.04], [0.001, 0.07]], 12), "#18181c", { finish: "fur", at: at(side * 0.195, 0.33, -0.08), rot: [-0.15, 0, side * -0.4], scale: [1, 1, 0.55] }));
    // Goggles up on the helmet: chrome rims round amber lenses.
    parts.push(part(tube(0.055, 0.055, 0.04, 22), "#e6e8ee", { finish: "chrome", at: at(side * 0.075, 0.17, 0.17), rot: [Math.PI / 2 - 0.9, 0, 0] }));
    parts.push(part(tube(0.046, 0.046, 0.045, 22), "#ffb347", { finish: "glass", at: at(side * 0.075, 0.17, 0.17), rot: [Math.PI / 2 - 0.9, 0, 0] }));
  }
  return parts;
}
