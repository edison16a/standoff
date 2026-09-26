import * as THREE from "three";
import type { MeshBuilder } from "../../kit/mesh-builder";
import type { Dresser } from "../model/dresser";
import type { LookKit } from "../model/look-kit";

/**
 * Pieces more than one costume wears: a cop over a knee or elbow, a plume
 * along a helmet's crest, and a skirt split in two so each half follows
 * its leg.
 */

/** A domed cop over a joint at height `y` on a limb, with a fan to the side. `front` 1 faces forward (a knee), -1 back (an elbow). */
export function kneeCop(b: MeshBuilder, plate: THREE.Material, y: number, radius: number, front: 1 | -1): void {
  b.sphere(radius, plate, [front * 0.012, y, 0], [1, 1, 1], 14);
  b.cylinder(radius * 0.9, radius * 0.9, 0.008, plate, [front * 0.012, y, 0], [Math.PI / 2, 0, 0], 16, [1, 1, 1.25]);
}

/** A plume along a helmet's crest, from the brow over to the back, in `feather`. */
export function plume(b: MeshBuilder, feather: THREE.Material, base: number): void {
  for (let i = 0; i < 13; i++) {
    const a = 0.3 + i * 0.2;
    b.sphere(0.04 - i * 0.0016, feather, [Math.cos(a) * 0.13 - 0.03, base + 0.07 + Math.sin(a) * 0.12, 0], [1, 1.15, 0.42], 10);
  }
  // Plumes trail past the helm at the back, curling down.
  for (let i = 0; i < 4; i++) b.sphere(0.028 - i * 0.004, feather, [-0.17 - i * 0.03, base - 0.02 - i * 0.05, 0], [1.1, 1.3, 0.4], 8);
}

/**
 * A skirt split front and back into halves that hang from each thigh, so
 * a stride never pushes a leg through the cloth. `length` is how far it
 * hangs, bordered in `edge`.
 */
export function splitSkirt(d: Dresser, kit: LookKit, cloth: THREE.MeshStandardMaterial, edge: THREE.Material, length: number): void {
  const sheet = kit.adopt(cloth.clone());
  sheet.side = THREE.DoubleSide;
  for (const side of ["R", "L"] as const) {
    const group = new THREE.Group();
    // Each half wraps the outside and front of its thigh.
    const start = side === "R" ? -Math.PI * 0.1 : Math.PI * 0.2;
    const arc = Math.PI * 0.95;
    const panel = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.14, length, 16, 2, true, start, arc), sheet);
    panel.position.y = -length / 2 + 0.05;
    panel.castShadow = true;
    const hem: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const theta = start + (arc * i) / 12;
      hem.push(new THREE.Vector3(0.141 * Math.sin(theta), -length + 0.05, 0.141 * Math.cos(theta)));
    }
    const border = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hem), 18, 0.008, 5), edge);
    border.castShadow = true;
    group.add(panel, border);
    d.attach(`thigh${side}`, group);
  }
}
