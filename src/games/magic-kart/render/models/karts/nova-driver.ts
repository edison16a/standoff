import * as THREE from "three";
import { part } from "../kit/part";
import { capsule, rbox, sphere, torus, tube } from "../kit/shapes";
import type { Rig } from "../parts/driver-rig";

const SHELL = "#f4f7fd";
const BLUE = "#1f6dff";
const NEON = "#4ff0ff";

/**
 * Nova's head: a glossy pearl shell with a wraparound smoked visor, two
 * glowing eyes on the visor, ear pods with neon rings and an antenna
 * with a pink light on top.
 */
export function novaHead(rig: Rig): THREE.BufferGeometry[] {
  const h = rig.joints.head;
  const c = new THREE.Vector3(h.x, h.y + 0.27, h.z + 0.02);
  const at = (x: number, y: number, z: number): [number, number, number] => [c.x + x, c.y + y, c.z + z];
  const r = 0.24;
  const visor = new THREE.SphereGeometry(r * 1.015, 36, 14, Math.PI / 2 - 1.05, 2.1, Math.PI * 0.34, Math.PI * 0.3);
  const parts = [
    part(capsule(0.065, 0.1, 12), "#5a6478", { finish: "gunmetal", at: [h.x, h.y + 0.08, h.z] }),
    part(torus(0.07, 0.012, 20, 6), "#b9c2d4", { finish: "chrome", at: [h.x, h.y + 0.06, h.z], rot: [Math.PI / 2, 0, 0] }),
    part(sphere(r, 36, 26), SHELL, { finish: "pearl", at: at(0, 0, 0), scale: [1.08, 0.92, 1] }),
    part(visor, "#0b1428", { finish: "glass", at: at(0, 0, 0), scale: [1.08, 0.92, 1] }),
    // A blue stripe over the crown, front to back.
    part(torus(r * 1.01, 0.022, 36, 8, Math.PI * 0.75), BLUE, { finish: "metallic", at: at(0, 0, 0), rot: [0, Math.PI / 2, Math.PI * 0.2], scale: [1, 0.92, 1] }),
    // The eyes, lit on the visor.
    part(rbox(0.075, 0.05, 0.02, 0.012), NEON, { finish: "neon", at: at(0.075, 0.015, r * 1.0 - 0.005), rot: [0, 0.3, 0] }),
    part(rbox(0.075, 0.05, 0.02, 0.012), NEON, { finish: "neon", at: at(-0.075, 0.015, r * 1.0 - 0.005), rot: [0, -0.3, 0] }),
    part(capsule(0.006, 0.26, 6), "#d8dde8", { finish: "chrome", at: at(0.06, 0.32, -0.08), rot: [0.15, 0, -0.12] }),
    part(sphere(0.035, 14, 10), "#ff5ad8", { finish: "neon", at: at(0.08, 0.47, -0.06) }),
  ];
  for (const side of [-1, 1]) {
    parts.push(part(tube(0.085, 0.085, 0.07, 28), "#c8d0e0", { finish: "brushed", at: at(side * 0.255, 0, 0), rot: [0, 0, Math.PI / 2] }));
    parts.push(part(torus(0.06, 0.01, 24, 6), NEON, { finish: "neon", at: at(side * 0.292, 0, 0), rot: [0, Math.PI / 2, 0] }));
  }
  return parts;
}
