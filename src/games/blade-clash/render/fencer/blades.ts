import * as THREE from "three";
import { leather, metal, plastic } from "../kit/materials";
import type { MeshBuilder, V3 } from "../kit/mesh-builder";

/**
 * The four weapons, modelled in blade space: the grip's middle at the
 * origin, the blade running out along +x to its tip at `length`, the
 * thumb side up (+y) and the flat of the blade facing the camera (+z).
 */

export type BladeKind = "epee" | "rapier" | "saber" | "arming";

export interface BladeColours {
  steel: THREE.ColorRepresentation;
  guard: THREE.ColorRepresentation;
  grip: THREE.ColorRepresentation;
}

/** Turns a part modelled along y so it runs along +x. */
const ALONG_X: V3 = [0, 0, -Math.PI / 2];

export function buildBlade(b: MeshBuilder, kind: BladeKind, length: number, colours: BladeColours): void {
  const steel = metal(colours.steel, 0.16, false);
  const guard = metal(colours.guard, 0.3);
  if (kind === "epee") epee(b, length, steel, guard, plastic(colours.grip, 0.55));
  else if (kind === "rapier") rapier(b, length, steel, guard, leather(colours.grip, 0.5));
  else if (kind === "saber") saber(b, length, steel, guard, leather(colours.grip, 0.55));
  else arming(b, length, steel, guard, leather(colours.grip, 0.62));
}

/** A modern épée: a stiff three sided blade, a big bell guard and a pistol grip. */
function epee(b: MeshBuilder, length: number, steel: THREE.Material, guard: THREE.Material, grip: THREE.Material): void {
  const start = 0.1;
  b.cylinder(0.0028, 0.0085, length - start, steel, [start + (length - start) / 2, 0, 0], ALONG_X, 3);
  b.cylinder(0.0042, 0.0042, 0.014, metal(0x3a3f47, 0.4), [length, 0, 0], ALONG_X, 10);
  // The bell: a shallow dome, domed toward the opponent, the hand inside it.
  const dome: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * 1.05;
    dome.push([0.072 * Math.sin(a) / Math.sin(1.05), 0.045 * (Math.cos(a) - Math.cos(1.05)) / (1 - Math.cos(1.05))]);
  }
  b.lathe([...dome].reverse(), guard, [start - 0.045, 0, 0], [1, 1, 1], 32, ALONG_X);
  b.lathe(dome.map(([r, y]) => [r * 0.97, y - 0.002] as [number, number]), metal(0x70767e, 0.5), [start - 0.045, 0, 0], [1, 1, 1], 32, ALONG_X);
  b.add(new THREE.TorusGeometry(0.072, 0.0032, 6, 40), guard, [start - 0.045, 0, 0], [0, Math.PI / 2, 0]);
  b.cylinder(0.05, 0.05, 0.006, plastic(0x22252c, 0.8), [start - 0.04, 0, 0], ALONG_X, 24);
  // Pistol grip with finger ridges underneath, and its nut.
  b.box(0.13, 0.028, 0.026, grip, [0.0, 0.0, 0], [0, 0, -0.08], 0.011);
  for (let i = 0; i < 3; i++) b.sphere(0.011, grip, [0.035 - i * 0.03, -0.018, 0], [1, 0.9, 1.1], 8);
  b.cylinder(0.012, 0.012, 0.022, metal(0x9aa2ad, 0.3), [-0.072, 0.004, 0], ALONG_X, 12);
}

/** A rapier: a long slim blade and a swept hilt of rings and a knuckle bow. */
function rapier(b: MeshBuilder, length: number, steel: THREE.Material, guard: THREE.Material, grip: THREE.Material): void {
  const start = 0.12;
  b.cylinder(0.0028, 0.0105, length - start, steel, [start + (length - start) / 2, 0, 0], [0, 0, -Math.PI / 2], 4, [1, 1, 0.38]);
  b.cylinder(0.009, 0.01, 0.06, steel, [0.1, 0, 0], ALONG_X, 4, [1, 1, 0.5]);
  // Quillons across the blade, curling at the ends.
  b.tube([[0.075, -0.105, 0], [0.078, -0.05, 0], [0.078, 0.05, 0], [0.075, 0.105, 0], [0.09, 0.118, 0]], 0.0045, guard, 24, 6);
  b.sphere(0.009, guard, [0.068, -0.108, 0], [1, 1, 1], 8);
  b.sphere(0.009, guard, [0.094, 0.118, 0], [1, 1, 1], 8);
  // The knuckle bow sweeps round the fingers to the pommel.
  b.tube([[0.078, -0.03, 0], [0.05, -0.068, 0.004], [-0.01, -0.075, 0.004], [-0.07, -0.05, 0], [-0.088, -0.018, 0]], 0.0042, guard, 24, 6);
  // Side rings and the loops over the ricasso.
  b.add(new THREE.TorusGeometry(0.036, 0.0035, 6, 28), guard, [0.1, 0, 0.018], [0, Math.PI / 2, 0], [1, 1, 1]);
  b.add(new THREE.TorusGeometry(0.03, 0.0032, 6, 24), guard, [0.1, -0.012, 0], [0, 0, 0], [1, 1, 1]);
  b.add(new THREE.TorusGeometry(0.022, 0.003, 6, 20), guard, [0.1, -0.03, 0.02], [Math.PI / 2, 0, 0], [1, 1, 1]);
  // Wire wrapped grip and an egg pommel.
  b.cylinder(0.0125, 0.0135, 0.14, grip, [0, 0, 0], ALONG_X, 12);
  for (let i = 0; i < 9; i++) b.add(new THREE.TorusGeometry(0.0132, 0.0016, 4, 14), guard, [-0.06 + i * 0.015, 0, 0], [0, Math.PI / 2, 0]);
  b.sphere(0.021, guard, [-0.092, 0, 0], [1.25, 1, 1], 14);
}

/** A curved saber, edge down, with a brass knuckle guard. */
function saber(b: MeshBuilder, length: number, steel: THREE.Material, guard: THREE.Material, grip: THREE.Material): void {
  const start = 0.085;
  const span = length - start;
  const centre = (x: number) => 0.055 * ((x - start) / span) ** 2;
  const width = (x: number) => 0.03 - 0.012 * ((x - start) / span);
  const shape = new THREE.Shape();
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const x = start + (span - 0.07) * (i / steps);
    const y = centre(x) + width(x) / 2;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.lineTo(length, centre(length) + 0.006);
  for (let i = steps; i >= 0; i--) {
    const x = start + (span - 0.07) * (i / steps);
    shape.lineTo(x, centre(x) - width(x) / 2);
  }
  shape.closePath();
  b.extrude(shape, 0.0055, steel, [0, 0, 0], [0, 0, 0], 0.0012);
  // A fuller down the back of the blade on both faces.
  for (const z of [-1, 1]) {
    const fuller: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = start + 0.03 + (span * 0.62) * (i / 8);
      fuller.push([x, centre(x) + width(x) * 0.18, z * 0.0035]);
    }
    b.tube(fuller, 0.0022, metal(0x8e97a3, 0.35, false), 16, 4);
  }
  // The guard: a shell at the blade and a broad bow round the knuckles.
  b.sphere(0.034, guard, [0.078, -0.008, 0], [0.22, 1, 0.75], 16);
  b.tube([[0.074, -0.03, 0], [0.045, -0.072, 0], [-0.02, -0.08, 0], [-0.08, -0.05, 0], [-0.09, -0.01, 0]], 0.009, guard, 28, 8);
  b.cylinder(0.0145, 0.0155, 0.13, grip, [-0.005, 0, 0], ALONG_X, 12);
  for (let i = 0; i < 6; i++) b.add(new THREE.TorusGeometry(0.0152, 0.0018, 4, 14), metal(0x6b4a1e, 0.5), [-0.055 + i * 0.02, 0, 0], [0, Math.PI / 2, 0]);
  b.box(0.14, 0.006, 0.018, guard, [-0.005, 0.015, 0], [0, 0, 0], 0.002);
  b.sphere(0.017, guard, [-0.083, 0.004, 0], [1.1, 1, 1], 12);
}

/** A knight's arming sword: a broad blade with a fuller, a cross guard and a wheel pommel. */
function arming(b: MeshBuilder, length: number, steel: THREE.Material, guard: THREE.Material, grip: THREE.Material): void {
  const start = 0.085;
  const shape = new THREE.Shape();
  shape.moveTo(start, 0.026);
  shape.lineTo(length - 0.16, 0.019);
  shape.quadraticCurveTo(length - 0.05, 0.014, length, 0);
  shape.quadraticCurveTo(length - 0.05, -0.014, length - 0.16, -0.019);
  shape.lineTo(start, -0.026);
  shape.closePath();
  b.extrude(shape, 0.004, steel, [0, 0, 0], [0, 0, 0], 0.0022);
  for (const z of [-1, 1]) b.box(length * 0.62, 0.008, 0.002, metal(0x7d8793, 0.3, false), [start + length * 0.33, 0, z * 0.0042], [0, 0, 0]);
  // Cross guard, with the ends turned toward the blade.
  b.tube([[0.1, -0.12, 0], [0.078, -0.1, 0], [0.074, 0, 0], [0.078, 0.1, 0], [0.1, 0.12, 0]], 0.0075, guard, 24, 8);
  b.box(0.022, 0.05, 0.02, guard, [0.078, 0, 0], [0, 0, 0], 0.006);
  b.cylinder(0.016, 0.017, 0.14, grip, [-0.005, 0, 0], ALONG_X, 12);
  b.cylinder(0.019, 0.019, 0.016, grip, [-0.005, 0, 0], ALONG_X, 12);
  b.cylinder(0.031, 0.031, 0.018, guard, [-0.095, 0, 0], [Math.PI / 2, 0, 0], 24);
  b.cylinder(0.018, 0.018, 0.024, metal(0xb58d2a, 0.35), [-0.095, 0, 0], [Math.PI / 2, 0, 0], 16);
  b.sphere(0.008, guard, [-0.117, 0, 0], [1, 1, 1], 8);
}
