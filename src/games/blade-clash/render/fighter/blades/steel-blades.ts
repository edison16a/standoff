import * as THREE from "three";
import type { MeshBuilder, V3 } from "../../kit/mesh-builder";
import type { LookKit } from "../model/look-kit";
import { wrapTexture } from "./blade-textures";

/**
 * The two steel swords, modelled in sword space: the middle of the grip
 * at the origin, the blade running out along +x to its tip at `length`,
 * the edges along y (the back of the blade at +y) and the flats facing z.
 * Both are gripped two handed, so the grips are long enough for two fists.
 */

/** Turns a part modelled along y so it runs along +x. */
const ALONG_X: V3 = [0, 0, -Math.PI / 2];
/** Where the blade leaves the guard, the same for every sword (the engine's hilt). */
export const BLADE_START = 0.1;

/** The Knight's longsword: a broad double edged blade with a fuller, a cross guard and a wheel pommel. */
export function longsword(b: MeshBuilder, kit: LookKit, length: number): void {
  const steel = kit.blade(0xe9eef4);
  const fuller = kit.metal(0x8a95a3, 0.22, false);
  const gold = kit.metal(0xc9a227, 0.3);
  const grip = kit.leather(0x3b2414, 0.65);
  const start = BLADE_START - 0.012;
  // A touch broader than a real longsword, so it reads from across the room.
  const shape = new THREE.Shape();
  shape.moveTo(start, 0.033);
  shape.lineTo(length - 0.2, 0.026);
  shape.quadraticCurveTo(length - 0.06, 0.02, length, 0);
  shape.quadraticCurveTo(length - 0.06, -0.02, length - 0.2, -0.026);
  shape.lineTo(start, -0.033);
  shape.closePath();
  b.extrude(shape, 0.0045, steel, [0, 0, 0], [0, 0, 0], 0.0022);
  // The fuller runs two thirds down both flats.
  for (const z of [-1, 1]) b.box((length - start) * 0.66, 0.009, 0.002, fuller, [start + (length - start) * 0.36, 0, z * 0.0048]);
  // A cross guard with its ends turned toward the blade, and a langet over the blade's root.
  b.tube([[0.098, -0.13, 0], [0.078, -0.11, 0], [0.074, 0, 0], [0.078, 0.11, 0], [0.098, 0.13, 0]], 0.0085, gold, 24, 8);
  b.sphere(0.012, gold, [0.1, -0.132, 0], [1, 1, 1], 8);
  b.sphere(0.012, gold, [0.1, 0.132, 0], [1, 1, 1], 8);
  b.box(0.03, 0.05, 0.022, gold, [0.082, 0, 0], [0, 0, 0], 0.007);
  // A long leather grip for two hands, bound with cord, and the wheel pommel.
  b.cylinder(0.016, 0.018, 0.22, grip, [-0.035, 0, 0], ALONG_X, 12);
  for (let i = 0; i < 7; i++) b.add(new THREE.TorusGeometry(0.0172, 0.0022, 4, 14), kit.leather(0x24150b, 0.7), [-0.13 + i * 0.032, 0, 0], [0, Math.PI / 2, 0]);
  b.cylinder(0.034, 0.034, 0.02, gold, [-0.165, 0, 0], [Math.PI / 2, 0, 0], 24);
  b.cylinder(0.02, 0.02, 0.026, kit.metal(0x9c1f2e, 0.35), [-0.165, 0, 0], [Math.PI / 2, 0, 0], 16);
  b.sphere(0.009, gold, [-0.19, 0, 0], [1, 1, 1], 8);
}

/** The Samurai's katana: a curved single edged blade with a bright temper line, a round tsuba and a wrapped handle. */
export function katana(b: MeshBuilder, kit: LookKit, length: number): void {
  const steel = kit.blade(0xeef1f5);
  const temper = kit.blade(0xffffff, 0.5);
  const iron = kit.metal(0x2a2b30, 0.45);
  const gold = kit.metal(0xd4a93a, 0.28);
  const start = BLADE_START - 0.008;
  const span = length - start;
  // The blade bows back toward +y, so the edge (at -y) is on the outside of the curve. The bow is
  // kept shallow and centred on the straight line the engine tests, so the tip is where hits count.
  const bow = (x: number) => {
    const u = (x - start) / span;
    return 0.034 * u * u - 0.014 * u;
  };
  const width = (x: number) => 0.038 - 0.008 * ((x - start) / span);
  const shape = new THREE.Shape();
  const steps = 28;
  const body = span - 0.075;
  for (let i = 0; i <= steps; i++) {
    const x = start + body * (i / steps);
    if (i === 0) shape.moveTo(x, bow(x) + width(x) / 2);
    else shape.lineTo(x, bow(x) + width(x) / 2);
  }
  // The kissaki: the back runs straight on, the edge sweeps up to meet it.
  shape.quadraticCurveTo(length - 0.02, bow(length) + 0.012, length, bow(length) + 0.009);
  shape.quadraticCurveTo(length - 0.045, bow(length) - 0.016, start + body, bow(start + body) - width(start + body) / 2);
  for (let i = steps; i >= 0; i--) {
    const x = start + body * (i / steps);
    shape.lineTo(x, bow(x) - width(x) / 2);
  }
  shape.closePath();
  b.extrude(shape, 0.0045, steel, [0, 0, 0], [0, 0, 0], 0.0015);
  // The hamon, a wavy pale line along the edge on both flats.
  for (const z of [-1, 1]) {
    const line: V3[] = [];
    for (let i = 0; i <= 14; i++) {
      const x = start + 0.02 + (body - 0.03) * (i / 14);
      line.push([x, bow(x) - width(x) * (0.18 + 0.08 * Math.sin(i * 1.9)), z * 0.0042]);
    }
    b.tube(line, 0.0022, temper, 40, 4);
  }
  // Habaki, the tsuba and its gold rim, then the long wrapped tsuka with a pommel cap.
  b.cylinder(0.019, 0.017, 0.028, gold, [0.086, 0.001, 0], ALONG_X, 12, [1, 1, 0.55]);
  b.cylinder(0.046, 0.046, 0.008, iron, [0.068, 0, 0], ALONG_X, 28, [1, 1, 0.82]);
  b.add(new THREE.TorusGeometry(0.046, 0.0028, 5, 32), gold, [0.068, 0, 0], [0, Math.PI / 2, 0], [1, 1, 0.82]);
  b.cylinder(0.016, 0.016, 0.012, gold, [0.058, 0, 0], ALONG_X, 12, [1, 1, 0.7]);
  const wrap = kit.adopt(new THREE.MeshStandardMaterial({ map: wrapTexture(), roughness: 0.75 }));
  b.cylinder(0.0165, 0.018, 0.25, wrap, [-0.075, 0, 0], ALONG_X, 16, [1, 1, 0.78]);
  b.cylinder(0.019, 0.017, 0.022, iron, [-0.205, 0, 0], ALONG_X, 16, [1, 1, 0.78]);
  b.sphere(0.017, iron, [-0.216, 0, 0], [0.6, 1, 0.78], 12);
}
