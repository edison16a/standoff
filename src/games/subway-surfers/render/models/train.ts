import * as THREE from "three";
import { TRAIN } from "../../engine/tuning";
import { cabTexture, carSideTexture, LIVERIES, PIECES } from "../art/train-art";
import { MeshBuilder } from "../mesh-builder";
import { prefab, textured } from "../prefabs";
import { glowTexture } from "../textures";
import { toon } from "../toon";
import { glow, lampGlow } from "./track";

const W = TRAIN.width;
const L = TRAIN.car;
const BODY_BOTTOM = 0.62;
const BODY_TOP = 3.08;
const GAUGE = 0.72;

const DARK = { color: 0x34363f, finish: "matte" as const };
const STEEL = { color: 0x8d949e, finish: "metal" as const };
const ROOF = { color: 0xd4d9e0, finish: "satin" as const };

let shadowMaterial: THREE.Material | null = null;

/** A soft dark patch under things, since the yard has no real shadows. */
export function shadowPaint(): THREE.Material {
  shadowMaterial ??= new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x2a2418, transparent: true, opacity: 0.45, depthWrite: false });
  shadowMaterial.userData.shared = true;
  return shadowMaterial;
}

/**
 * A whole train, front at z = 0 and running back car by car: bold paint,
 * windows, doors and graffiti on the sides, a pale roof to run along,
 * an ink outline, and lamps lit on one that is moving. Built once per
 * paint job, length and state, then pooled.
 */
export function trainModel(livery: number, cars: number, lit: boolean, piece: number): THREE.Group {
  const paint = livery % LIVERIES.length;
  return prefab(`train-${paint}-${cars}-${lit}-${piece % PIECES}`, () => {
    const b = new MeshBuilder();
    for (let i = 0; i < cars; i++) {
      b.from(0, 0, -i * (L + TRAIN.gap));
      car(b, paint, (piece + i) % PIECES, i === 0, i === cars - 1, lit);
    }
    b.from(0, 0, 0);
    const length = cars * L + (cars - 1) * TRAIN.gap;
    b.panel(W + 0.8, length + 0.6, shadowPaint(), [0, 0.03, -length / 2], [-Math.PI / 2, 0, 0]);
    const group = b.build("train");
    if (lit) {
      for (const x of [-0.72, 0.72]) {
        const halo = lampGlow(1.8, 0xfff1b8, 0.75);
        halo.position.set(x, 1.1, 0.45);
        group.add(halo);
      }
    }
    return group;
  });
}

function car(b: MeshBuilder, livery: number, piece: number, front: boolean, rear: boolean, lit: boolean): void {
  const l = LIVERIES[livery]!;
  const bodyH = BODY_TOP - BODY_BOTTOM;
  const mid = BODY_BOTTOM + bodyH / 2;
  b.outline(0.045);
  b.box(W, bodyH, L, { color: l.body, finish: "satin" }, [0, mid, -L / 2], undefined, 0.14);
  b.box(W - 0.14, TRAIN.height - BODY_TOP + 0.04, L - 0.12, ROOF, [0, (BODY_TOP + TRAIN.height) / 2 - 0.02, -L / 2], undefined, 0.14);
  b.outline(0.025);
  // Flat vents along the roof edges, clear of the middle where the runner's feet go.
  for (const x of [-0.72, 0.72]) for (const z of [-3.2, -9.8]) b.box(0.5, 0.08, 1.8, { color: 0xaab1bb, finish: "metal" }, [x, TRAIN.height, z], undefined, 0.03);
  b.outline(0);
  // Underneath: the frame, boxes of equipment and two bogies of wheels.
  b.box(W - 0.3, 0.3, L - 0.8, DARK, [0, BODY_BOTTOM - 0.12, -L / 2]);
  for (const z of [-L / 2 - 2.2, -L / 2 + 2.2]) b.box(1.3, 0.36, 1.6, { color: 0x4b4f5a, finish: "satin" }, [0, 0.46, z], undefined, 0.05);
  for (const z of [-2.3, -L + 2.3]) {
    b.box(1.9, 0.28, 2.6, DARK, [0, 0.42, z], undefined, 0.06);
    for (const dz of [-0.75, 0.75]) for (const x of [-GAUGE, GAUGE]) b.tube(0.34, 0.14, STEEL, [x, 0.36, z + dz], 16, 0.34, [0, 0, Math.PI / 2]);
  }
  const sides = textured(`car-side-${livery}`, () => toon({ map: carSideTexture(livery) }));
  const rows: [number, number, number, number] = [0, 1 - (piece + 1) / PIECES, 1, 1 - piece / PIECES];
  for (const s of [-1, 1]) b.panel(L - 0.3, bodyH - 0.1, sides, [s * (W / 2 + 0.006), mid, -L / 2], [0, (s * Math.PI) / 2, 0], rows);
  if (front) cab(b, livery, 1, lit);
  if (rear) cab(b, livery, -1, false);
  // Rubber bellows over the gap to the next car.
  if (!rear) b.box(1.5, 2.3, TRAIN.gap + 0.2, DARK, [0, 1.9, -L - TRAIN.gap / 2]);
}

/** A driving cab: the painted face, a bumper and coupler, and the lamps. `face` is 1 at the front, -1 at the back. */
function cab(b: MeshBuilder, livery: number, face: number, lit: boolean): void {
  const z = face > 0 ? 0 : -L;
  const mid = (BODY_TOP + BODY_BOTTOM) / 2;
  const face3 = textured(`cab-${livery}`, () => toon({ map: cabTexture(livery) }));
  b.panel(W - 0.2, BODY_TOP - BODY_BOTTOM - 0.1, face3, [0, mid, z + face * 0.006], [0, face > 0 ? 0 : Math.PI, 0]);
  b.outline(0.03);
  b.box(W - 0.3, 0.3, 0.26, { color: 0x4b4f5a, finish: "satin" }, [0, 0.72, z + face * 0.1], undefined, 0.06);
  b.box(0.46, 0.26, 0.4, STEEL, [0, 0.58, z + face * 0.3]);
  b.outline(0);
  const lamp = lit ? glow(0xfff4c8) : { color: 0xe8e4d8, finish: "gloss" as const };
  for (const x of [-0.72, 0.72]) {
    b.tube(0.18, 0.06, { color: 0x2a2d38, finish: "satin" }, [x, 1.1, z + face * 0.03], 16);
    b.tube(0.13, 0.05, face > 0 ? lamp : glow(0xff4a3a), [x, 1.1, z + face * 0.06], 16);
  }
}
