import * as THREE from "three";
import { ball, box, capsule, cyl, lathe, merge, paint, shade, torus } from "./geo";
import { buildHelmet } from "./helmet";
import { joint, type Mesher } from "./joint";
import { jerseyTexture } from "./jersey-texture";
import type { KitSpec } from "./kit";
import { buildLimbs } from "./limbs";

/** The joints the animations turn. Every limb segment hangs down its joint's -y. */
export interface Rig {
  root: THREE.Group;
  /** Lifts, tips and rolls the whole body, for stances, dives and tackles. */
  body: THREE.Group;
  hips: THREE.Object3D;
  spine: THREE.Object3D;
  neck: THREE.Object3D;
  shoulderL: THREE.Object3D;
  elbowL: THREE.Object3D;
  shoulderR: THREE.Object3D;
  elbowR: THREE.Object3D;
  hipL: THREE.Object3D;
  kneeL: THREE.Object3D;
  ankleL: THREE.Object3D;
  hipR: THREE.Object3D;
  kneeR: THREE.Object3D;
  ankleR: THREE.Object3D;
  handL: THREE.Object3D;
  handR: THREE.Object3D;
  /** Hip height standing, in metres. */
  hipHeight: number;
  /** Thigh plus shin, for matching the stride to the ground speed. */
  legLength: number;
  dispose(): void;
}

/**
 * Builds a football player: helmet, shoulder pads under a printed
 * jersey, pants, socks and cleats, sized by height and build. Colours
 * live in the vertices so every part shares one material, except the
 * jersey, which wears its own printed texture, and a tinted visor.
 */
export function buildBody(kit: KitSpec, shared: THREE.Material): Rig {
  const s = kit.height / 1.85;
  const b = kit.build;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const mesh: Mesher = (parent, geo, material = shared) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hipHeight = 0.95 * s;
  const hips = joint(body, 0, hipHeight);
  const pelvis = [
    paint(capsule(0.13 * s, 0.1 * s), kit.pants, { rot: [0, 0, Math.PI / 2], scale: [1, 1.1 + 0.2 * b, 0.95 + 0.1 * b] }),
    paint(torus(0.15 * s * (1 + 0.12 * b), 0.018 * s, 24, 6), shade(kit.pants, -0.55), { at: [0, 0.08 * s, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.72, 1] }),
  ];
  if (kit.towel) pelvis.push(paint(box(0.1 * s, 0.2 * s, 0.012 * s), "#f7f7f5", { at: [0.07 * s, -0.02 * s, 0.13 * s], rot: [0.08, 0, 0] }));
  mesh(hips, merge(pelvis));

  const spine = joint(hips, 0, 0.05 * s);
  const torsoH = 0.56 * s;
  const w = (1.12 + 0.22 * b) * s;
  const d = (0.8 + 0.14 * b) * s;
  // The pads make a football player's chest a wide slab that juts over the arms.
  const profile = [[0.14, 0], [0.145, 0.12], [0.16, 0.26], [0.19, 0.38], [0.205, 0.45], [0.18, 0.51], [0.08, 0.56]] as const;
  const torso = lathe(profile.map(([r, y]) => [r, y * (torsoH / 0.56 / s)] as const), 28, Math.PI / 2);
  torso.scale(w, s, d);
  const shirtMap = jerseyTexture(kit);
  textures.push(shirtMap);
  const shirt = new THREE.MeshStandardMaterial({ map: shirtMap, roughness: 0.62, metalness: 0.02 });
  materials.push(shirt);
  mesh(spine, torso, shirt);
  const padX = (0.19 + 0.03 * b) * s;
  const pads = [
    // Pad caps over each shoulder, under the jersey.
    paint(ball(0.12 * s, 16, 10), kit.jersey, { at: [padX, torsoH - 0.075 * s, 0], scale: [1.05, 0.55, 1.2] }),
    paint(ball(0.12 * s, 16, 10), kit.jersey, { at: [-padX, torsoH - 0.075 * s, 0], scale: [1.05, 0.55, 1.2] }),
  ];
  if (kit.neckRoll) pads.push(paint(torus(0.085 * s, 0.035 * s, 18, 8, Math.PI), shade(kit.jersey, -0.35), { at: [0, torsoH - 0.02 * s, -0.01 * s], rot: [Math.PI / 2, 0, Math.PI] }));
  mesh(spine, merge(pads));

  const neck = joint(spine, 0, torsoH - 0.02 * s);
  mesh(neck, merge([paint(cyl(0.055 * s, 0.065 * s, 0.12 * s), kit.look.skin, { at: [0, 0.05 * s, 0] })]));
  const helmet = buildHelmet(kit);
  const head = mesh(neck, helmet.body);
  head.position.y = 0.2 * s;
  head.scale.setScalar(Math.pow(s, 0.5));
  if (helmet.visor) {
    const glass = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.7, transparent: true, opacity: 0.88 });
    materials.push(glass);
    const visor = mesh(head, helmet.visor, glass);
    visor.castShadow = false;
  }

  const limbs = buildLimbs(kit, s, torsoH, spine, hips, mesh);
  return {
    root, body, hips, spine, neck, ...limbs, hipHeight, legLength: limbs.legLength,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
