import * as THREE from "three";
import { TRAIN } from "../../engine/tuning";
import { cabGlowTexture, cabTexture, carGlowTexture, carSideTexture, LIVERIES } from "../art/train-art";
import { MeshBuilder } from "../mesh-builder";
import { glowTexture } from "../textures";

export type CarRole = "front" | "middle" | "rear" | "single";

const W = TRAIN.width;
const L = TRAIN.car;
const BODY_BOTTOM = 0.62;
const BODY_TOP = 3.12;
const GAUGE = 0.72;

const materials = new Map<string, THREE.Material>();

/** Painted sides, glossy for the neon to shine in, and lit from inside where `glow` is white. */
function textured(key: string, texture: () => THREE.Texture, glow: () => THREE.Texture): THREE.Material {
  let material = materials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ map: texture(), roughness: 0.3, metalness: 0.25, emissive: 0xffe6c0, emissiveMap: glow(), emissiveIntensity: 1.1 });
    material.userData.shared = true;
    materials.set(key, material);
  }
  return material;
}

let shadowMaterial: THREE.Material | null = null;

/** A soft dark patch under things, since the yard has no real shadows. */
export function shadowPaint(): THREE.Material {
  shadowMaterial ??= new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });
  shadowMaterial.userData.shared = true;
  return shadowMaterial;
}

const prefabs = new Map<string, THREE.Group>();

/**
 * One train car, front end at z = 0 and running back to z = -13, built
 * once per paint job and role and then shared. Cab ends carry the
 * windscreen and lamps, lit on a train that is moving.
 */
export function trainCar(livery: number, role: CarRole, graffiti: number | null, lit: boolean): THREE.Group {
  const key = `${livery}-${role}-${graffiti}-${lit}`;
  let prefab = prefabs.get(key);
  if (!prefab) {
    prefab = buildCar(livery, role, graffiti, lit);
    prefabs.set(key, prefab);
  }
  return prefab.clone();
}

function buildCar(livery: number, role: CarRole, graffiti: number | null, lit: boolean): THREE.Group {
  const l = LIVERIES[livery % LIVERIES.length]!;
  const b = new MeshBuilder();
  const paint = { color: l.body, finish: "gloss" as const };
  const dark = { color: 0x2a2d35, finish: "matte" as const };
  const steel = { color: 0x9aa3ad, finish: "metal" as const };
  const mid = -L / 2;
  const bodyH = BODY_TOP - BODY_BOTTOM;

  b.box(W, bodyH, L, paint, [0, BODY_BOTTOM + bodyH / 2, mid], undefined, 0.14);
  b.box(W - 0.14, 0.34, L - 0.1, { color: 0x4a4e60, finish: "satin" }, [0, BODY_TOP + 0.12, mid], undefined, 0.14);
  for (const x of [-0.72, 0.72]) b.box(0.3, 0.1, L - 1.6, { color: 0x8a90a0, finish: "metal" }, [x, TRAIN.height - 0.02, mid], undefined, 0.04);
  // Underneath: the frame, boxes of equipment and two bogies of wheels.
  b.box(W - 0.3, 0.3, L - 0.8, dark, [0, BODY_BOTTOM - 0.12, mid]);
  for (const z of [mid - 2.2, mid + 2.2]) b.box(1.2, 0.36, 1.6, { color: 0x3b3f4a, finish: "satin" }, [0, 0.46, z], undefined, 0.05);
  for (const z of [-2.3, -L + 2.3]) {
    b.box(1.9, 0.28, 2.6, dark, [0, 0.42, z], undefined, 0.06);
    for (const dz of [-0.75, 0.75]) for (const x of [-GAUGE, GAUGE]) b.tube(0.34, 0.14, steel, [x, 0.36, z + dz], 16, 0.34, [0, 0, Math.PI / 2]);
  }
  const side = textured(`side-${livery}-${graffiti}`, () => carSideTexture(livery, graffiti), carGlowTexture);
  // Neon tubes along the skirt and the roof line on both sides, the look of the night line.
  const neon = { color: l.neon, finish: "glow" as const };
  for (const x of [-1, 1]) {
    b.box(0.05, 0.06, L - 0.5, neon, [x * (W / 2 + 0.02), BODY_BOTTOM + 0.1, mid]);
    b.box(0.05, 0.05, L - 0.5, neon, [x * (W / 2 - 0.02), BODY_TOP + 0.02, mid]);
  }
  b.panel(L - 0.3, bodyH - 0.12, side, [W / 2 + 0.006, BODY_BOTTOM + bodyH / 2, mid], [0, Math.PI / 2, 0]);
  b.panel(L - 0.3, bodyH - 0.12, side, [-W / 2 - 0.006, BODY_BOTTOM + bodyH / 2, mid], [0, -Math.PI / 2, 0]);

  const cabs: number[] = [];
  if (role === "front" || role === "single") cabs.push(1);
  if (role === "rear" || role === "single") cabs.push(-1);
  for (const face of cabs) cab(b, livery, face, lit);
  // Rubber bellows join cars that have a neighbour.
  if (role === "middle" || role === "front") b.box(1.5, 2.5, TRAIN.gap + 0.2, dark, [0, 1.9, -L - TRAIN.gap / 2]);
  b.panel(W + 0.6, L + 0.4, shadowPaint(), [0, 0.03, mid], [-Math.PI / 2, 0, 0]);
  const group = b.build("train-car");
  group.userData.sharedGeometry = true;
  return group;
}

/** A driving cab: the painted face, a visor, the coupler and the lamps. `face` is 1 at the front, -1 at the back. */
function cab(b: MeshBuilder, livery: number, face: number, lit: boolean): void {
  const z = face > 0 ? 0 : -L;
  const outer = z + face * 0.18;
  const mid = (BODY_TOP + BODY_BOTTOM) / 2;
  const face3 = textured(`cab-${livery}`, () => cabTexture(livery), cabGlowTexture);
  b.box(W - 0.1, BODY_TOP - BODY_BOTTOM, 0.24, { color: LIVERIES[livery % LIVERIES.length]!.body, finish: "gloss" }, [0, mid, z + face * 0.06], undefined, 0.1);
  b.panel(W - 0.16, BODY_TOP - BODY_BOTTOM - 0.06, face3, [0, mid, outer + face * 0.004], [0, face > 0 ? 0 : Math.PI, 0]);
  // A visor along the top of the windscreen, under the destination sign so the sign stays readable, and a coupler below.
  b.box(W - 0.2, 0.08, 0.36, { color: 0x1d2029, finish: "gloss" }, [0, 2.47, outer + face * 0.17]);
  b.box(0.46, 0.28, 0.5, { color: 0x3a3f4b, finish: "metal" }, [0, 0.55, outer + face * 0.2]);
  const lamp = lit ? { color: 0xfff4c8, finish: "glow" as const } : { color: 0x8c8f96, finish: "satin" as const };
  for (const x of [-0.72, 0.72]) {
    b.tube(0.17, 0.08, { color: 0x20232b, finish: "satin" }, [x, 1.05, outer + face * 0.03], 16);
    b.tube(0.13, 0.06, lamp, [x, 1.05, outer + face * 0.07], 16);
  }
  b.tube(0.07, 0.06, lit ? { color: 0xff4040, finish: "glow" } : { color: 0x6b2a2a, finish: "satin" }, [0, 2.95, outer + face * 0.04], 10);
}

let beamMaterial: THREE.SpriteMaterial | null = null;

/** The glare of a moving train's headlamps, seen from far down the track. */
export function headlightGlow(): THREE.Sprite {
  beamMaterial ??= new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff1b8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 });
  beamMaterial.userData.shared = true;
  const sprite = new THREE.Sprite(beamMaterial);
  sprite.scale.setScalar(3.4);
  sprite.userData.sharedGeometry = true;
  return sprite;
}
