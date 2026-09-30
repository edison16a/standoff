import * as THREE from "three";
import { MeshBuilder } from "../../render/mesh-builder";
import { glowTexture } from "../../render/textures";
import { worldMaterials } from "../../render/world/materials";

/** Where the team stands: the bed's floor height and its length, rear at +z. */
export const BED = { floor: 1.02, front: 0.45, rear: 2.55, halfWidth: 0.86 } as const;
export const WHEEL_RADIUS = 0.46;

export interface Truck {
  root: THREE.Group;
  wheels: THREE.Group[];
  /** The body, which rocks on its springs over the wheels. */
  body: THREE.Group;
  dispose(): void;
}

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3, ...p });

/**
 * The team's ride for the trailer: a battered pickup with a bull bar, a
 * roll bar with lamps and the bed open behind. It faces -z, the way the
 * route runs. Headlights throw real light up the street and the tail
 * lights wash the dead chasing it in red.
 */
export function buildTruck(env: THREE.Texture): Truck {
  const w = worldMaterials();
  // Its own reflections, so the paint and glass catch light like metal in the dark street.
  const paint = std({ color: 0x3f4a2e, metalness: 0.45, roughness: 0.5, envMap: env, envMapIntensity: 0.35 });
  const glass = std({ color: 0x0b1118, metalness: 0.9, roughness: 0.08, envMap: env, envMapIntensity: 0.6 });
  const primer = std({ color: 0x2a2c26, roughness: 0.9, metalness: 0.1 });
  const rust = w.rust;
  const b = new MeshBuilder();
  // Lower body, hood, cab and the bed's walls.
  b.box(2.04, 0.62, 5.3, paint, [0, 0.86, 0], undefined, 0.08);
  b.box(1.96, 0.3, 1.7, paint, [0, 1.3, -1.72], [-0.05, 0, 0], 0.1);
  b.box(1.9, 0.78, 1.46, paint, [0, 1.56, -0.28], undefined, 0.12);
  b.box(1.78, 0.52, 0.06, glass, [0, 1.6, -1.02], [-0.42, 0, 0]);
  for (const s of [-1, 1]) {
    b.box(0.05, 0.46, 1.1, glass, [s * 0.96, 1.62, -0.3]);
    // Door pillars and frames, so the cab reads as a cab and not a block.
    for (const z of [-0.92, -0.3, 0.36]) b.box(0.08, 0.5, 0.08, paint, [s * 0.97, 1.62, z]);
    b.box(0.03, 0.02, 1.3, w.darkMetal, [s * 1.03, 1.06, -0.3]);
    b.box(0.04, 0.05, 0.16, w.chrome, [s * 1.03, 1.2, 0.05]);
    b.box(0.12, 0.44, 2.2, paint, [s * (BED.halfWidth + 0.08), 1.36, (BED.front + BED.rear) / 2], undefined, 0.03);
    // Wheel arches, flared and dark.
    for (const z of [-1.62, 1.72]) b.box(0.18, 0.2, 1.24, primer, [s * 1.02, 1.08, z], undefined, 0.06);
    b.box(0.3, 0.12, 0.08, w.chrome, [s * 1.08, 1.62, -0.98]);
  }
  b.box(1.9, 0.44, 0.1, paint, [0, 1.36, BED.rear + 0.02], undefined, 0.03);
  b.box(1.72, 0.06, 2.1, primer, [0, BED.floor, (BED.front + BED.rear) / 2]);
  // Rust where the paint has gone, and a primer grey door from another truck.
  b.box(0.02, 0.5, 0.9, primer, [1.03, 0.92, -0.35]);
  b.box(0.7, 0.02, 0.5, rust, [0.4, 1.46, -1.9]);
  b.box(0.02, 0.24, 0.6, rust, [-1.03, 1.2, 1.9]);
  // Bull bar, grille and bumpers.
  const steel = w.darkMetal;
  b.box(1.7, 0.34, 0.08, steel, [0, 1.08, -2.66]);
  for (let i = 0; i < 6; i++) b.box(0.04, 0.3, 0.04, w.chrome, [(i - 2.5) * 0.24, 1.08, -2.71]);
  b.box(2.1, 0.2, 0.2, steel, [0, 0.66, -2.72], undefined, 0.04);
  b.box(2.08, 0.18, 0.18, steel, [0, 0.66, 2.7], undefined, 0.04);
  for (const s of [-1, 1]) {
    b.tube(0.04, 0.9, steel, [s * 0.62, 1.12, -2.86], 8, 0.04, [0, 0, 0]);
    b.tube(0.04, 0.5, steel, [s * 0.62, 0.9, -2.8], 8, 0.04, [Math.PI / 2.6, 0, 0]);
  }
  b.box(1.5, 0.05, 0.05, steel, [0, 1.55, -2.86]);
  // The roll bar over the bed, with its row of lamps.
  for (const s of [-1, 1]) b.tube(0.05, 1.0, steel, [s * 0.86, 1.9, BED.front + 0.05], 10, 0.05, [0, 0, 0]);
  b.tube(0.05, 1.8, steel, [0, 2.4, BED.front + 0.05], 10, 0.05, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 4; i++) b.box(0.26, 0.16, 0.14, steel, [(i - 1.5) * 0.36, 2.5, BED.front + 0.02], undefined, 0.02);
  // Lamps and lenses. They glow whether or not the real lights reach anything.
  const lamp = std({ color: 0xffffff, emissive: 0xfff0d0, emissiveIntensity: 3 });
  const tail = std({ color: 0x440000, emissive: 0xff1a10, emissiveIntensity: 3 });
  for (const s of [-1, 1]) {
    b.box(0.34, 0.16, 0.05, lamp, [s * 0.72, 1.22, -2.64]);
    b.box(0.08, 0.3, 0.14, tail, [s * 0.95, 1.3, BED.rear + 0.03]);
  }
  for (let i = 0; i < 4; i++) b.box(0.2, 0.1, 0.02, lamp, [(i - 1.5) * 0.36, 2.5, BED.front - 0.06]);
  const body = new THREE.Group();
  body.add(b.build("truck"));
  lights(body);

  const wheels: THREE.Group[] = [];
  for (const [x, z] of [[-0.96, -1.62], [0.96, -1.62], [-0.96, 1.72], [0.96, 1.72]] as const) wheels.push(wheel(x, z));
  const root = new THREE.Group();
  root.add(body, ...wheels);
  return {
    root,
    body,
    wheels,
    dispose: () => {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
        if (o instanceof THREE.Sprite) o.material.dispose();
      });
      paint.dispose();
      glass.dispose();
      primer.dispose();
      lamp.dispose();
      tail.dispose();
    },
  };
}

/** A chunky off road tyre on a steel rim. Its group turns about x as it rolls. */
function wheel(x: number, z: number): THREE.Group {
  const w = worldMaterials();
  const b = new MeshBuilder();
  const side: [number, number, number] = [0, 0, Math.PI / 2];
  b.tube(WHEEL_RADIUS, 0.34, w.tire, [0, 0, 0], 18, WHEEL_RADIUS, side);
  b.tube(0.26, 0.36, w.darkMetal, [0, 0, 0], 12, 0.26, side);
  // Tread blocks, so the roll shows.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.box(0.36, 0.06, 0.1, w.tire, [0, Math.cos(a) * WHEEL_RADIUS, Math.sin(a) * WHEEL_RADIUS], [a, 0, 0]);
  }
  const group = new THREE.Group();
  group.add(b.build("wheel"));
  group.position.set(x, WHEEL_RADIUS, z);
  return group;
}

/** Headlights up the road, the roll bar's flood and a red wash off the tail lights. */
function lights(body: THREE.Group): void {
  for (const s of [-1, 1]) {
    const head = new THREE.SpotLight(0xfff0d8, 60, 45, 0.42, 0.5, 1.2);
    head.position.set(s * 0.72, 1.22, -2.7);
    head.target.position.set(s * 0.8, 0, -14);
    body.add(head, head.target);
    body.add(flare(0xfff2dc, [s * 0.72, 1.22, -2.72], 1.3));
    body.add(flare(0xff2a18, [s * 0.95, 1.3, BED.rear + 0.1], 0.7));
  }
  const red = new THREE.PointLight(0xff2412, 12, 16, 1.4);
  // Out behind the tailgate, so it washes the road and the chasers rather than the truck.
  red.position.set(0, 1.0, BED.rear + 1.4);
  body.add(red);
  for (let i = 0; i < 4; i++) body.add(flare(0xfff2dc, [(i - 1.5) * 0.36, 2.5, BED.front - 0.1], 0.9));
}

function flare(colour: number, at: readonly [number, number, number], size: number): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: colour, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  sprite.position.set(...at);
  sprite.scale.setScalar(size);
  return sprite;
}
