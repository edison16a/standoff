import * as THREE from "three";
import type { Kit, Look } from "../../roster";
import { ball, box, capsule, cyl, lathe, merge, paint, shade, torus } from "./geo";
import { headGeometry } from "./head";
import { jerseyTexture } from "./kit-texture";

export interface BodySpec {
  look: Look;
  kit: Kit;
  name: string;
  number: number;
  /** Long sleeves and big gloves. */
  keeper?: boolean;
}

/** The joints the animations turn. Every limb segment hangs down its joint's -y. */
export interface Rig {
  root: THREE.Group;
  /** Lifts, tips and rolls the whole body, for slides, dives and jumps. */
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
  height: number;
  dispose(): void;
}

const joint = (parent: THREE.Object3D, x: number, y: number, z = 0) => {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
};

/**
 * Builds a footballer: a jointed body in their kit, sized by height and
 * build. Colours live in the vertices so every part shares one material,
 * except the shirt, which wears its own printed texture.
 */
export function buildBody(spec: BodySpec, shared: THREE.Material): Rig {
  const { look, kit } = spec;
  const s = look.height / 1.8;
  const b = look.build;
  const geometries: THREE.BufferGeometry[] = [];
  const shirtMap = jerseyTexture(kit, spec.name, spec.number, spec.keeper);
  const shirt = new THREE.MeshStandardMaterial({ map: shirtMap, roughness: 0.7, metalness: 0.02 });
  const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material = shared) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hipHeight = 0.94 * s;
  const hips = joint(body, 0, hipHeight);
  const hipW = (0.095 + 0.015 * b) * s;
  // Shorts: a rounded seat with the legs flaring out below.
  mesh(hips, merge([paint(capsule(0.12 * s, 0.1 * s), kit.shorts, { rot: [0, 0, Math.PI / 2], scale: [1, 1.05 + 0.2 * b, 0.95] })]));

  const spine = joint(hips, 0, 0.04 * s);
  const torsoH = 0.54 * s;
  const w = (1.18 + 0.2 * b) * s;
  const d = (0.78 + 0.12 * b) * s;
  const profile = [[0.13, 0], [0.14, 0.1], [0.155, 0.24], [0.168, 0.36], [0.165, 0.44], [0.13, 0.5], [0.07, 0.54]] as const;
  const torso = lathe(profile.map(([r, y]) => [r, y * (torsoH / 0.54 / s)] as const), 28, Math.PI / 2);
  torso.scale(w, s, d);
  mesh(spine, torso, shirt);
  mesh(spine, merge([paint(torus(0.066 * s, 0.014 * s, 20, 6), kit.trim, { at: [0, torsoH - 0.01 * s, 0], rot: [Math.PI / 2, 0, 0] })]));

  const neck = joint(spine, 0, torsoH);
  const headLift = 0.14 * s;
  mesh(neck, merge([paint(cyl(0.05 * s, 0.058 * s, 0.1 * s), look.skin, { at: [0, 0.04 * s, 0] })]));
  const head = mesh(neck, headGeometry(look));
  head.position.y = headLift;
  head.scale.setScalar(s);

  const shoulderX = (0.185 + 0.04 * b) * s;
  const arm = (side: -1 | 1) => {
    const shoulder = joint(spine, side * shoulderX, torsoH - 0.07 * s);
    const upper = 0.29 * s;
    const fore = 0.26 * s;
    const r = (0.056 + 0.018 * b) * s;
    const sleeve = spec.keeper ? upper : upper * 0.52;
    const upperSkin = spec.keeper ? kit.shirt : look.skin;
    mesh(shoulder, merge([
      paint(ball(r * 1.3, 12, 10), kit.shirt, { scale: [1, 0.92, 1.05] }),
      paint(cyl(r * 1.24, r * 1.14, sleeve, 12), kit.shirt, { at: [0, -sleeve / 2, 0] }),
      paint(torus(r * 1.15, r * 0.14, 14, 4), kit.trim, { at: [0, -sleeve, 0], rot: [Math.PI / 2, 0, 0] }),
      // The biceps swell a little under the sleeve's hem.
      paint(ball(r * 0.98, 12, 10), upperSkin, { at: [0, -upper * 0.55, r * 0.08], scale: [1, 1.7, 1] }),
      paint(cyl(r * 0.84, r * 0.8, upper * 0.4, 10), upperSkin, { at: [0, -upper * 0.8, 0] }),
    ]));
    const elbow = joint(shoulder, 0, -upper);
    const forearm = spec.keeper ? kit.shirt : look.skin;
    const glove = spec.keeper ? kit.trim : look.skin;
    const hand = spec.keeper ? 1.55 : 1;
    mesh(elbow, merge([
      paint(ball(r * 0.82, 10, 8), forearm),
      paint(ball(r * 0.86, 10, 8), forearm, { at: [0, -fore * 0.3, r * 0.05], scale: [1, 1.9, 1] }),
      paint(cyl(r * 0.7, r * 0.56, fore * 0.5, 10), forearm, { at: [0, -fore * 0.72, 0] }),
      // A mitten of a hand, thumb tucked along the front.
      paint(ball(r * 0.78 * hand, 12, 10), glove, { at: [0, -fore - r * 0.7 * hand, r * 0.1], scale: [0.85, 1.35, 0.62] }),
      paint(ball(r * 0.32 * hand, 8, 6), glove, { at: [side * -r * 0.35, -fore - r * 0.4 * hand, r * 0.45 * hand], scale: [0.8, 1.4, 0.8] }),
      ...(spec.keeper ? [paint(cyl(r * 0.9, r * 0.9, r * 0.9, 12), "#1b1b1b", { at: [0, -fore, 0] })] : []),
    ]));
    const handJoint = joint(elbow, 0, -fore - r);
    return { shoulder, elbow, hand: handJoint };
  };

  const leg = (side: -1 | 1) => {
    const hip = joint(hips, side * hipW, -0.02 * s);
    const thigh = 0.44 * s;
    const shin = 0.43 * s;
    const r = (0.076 + 0.026 * b) * s;
    mesh(hip, merge([
      paint(cyl(r * 1.5, r * 1.4, thigh * 0.46, 14), kit.shorts, { at: [0, -thigh * 0.2, 0] }),
      paint(box(r * 0.3, thigh * 0.4, r * 0.5), kit.trim, { at: [side * r * 1.42, -thigh * 0.2, 0] }),
      paint(ball(r * 1.12, 12, 10), look.skin, { at: [0, -thigh * 0.6, r * 0.12], scale: [1, 2.1, 1.05] }),
      paint(ball(r * 0.86, 10, 8), look.skin, { at: [0, -thigh, r * 0.12] }),
    ]));
    const knee = joint(hip, 0, -thigh);
    mesh(knee, merge([
      paint(cyl(r * 0.82, r * 0.9, shin * 0.14, 10), look.skin, { at: [0, -shin * 0.07, 0] }),
      paint(cyl(r * 0.92, r * 0.6, shin * 0.8, 12), kit.socks, { at: [0, -shin * 0.55, 0] }),
      paint(cyl(r * 0.95, r * 0.95, shin * 0.07, 12), kit.trim, { at: [0, -shin * 0.2, 0] }),
      // The calf bulges at the back, the shin pad sits flat at the front.
      paint(ball(r * 0.82, 12, 10), kit.socks, { at: [0, -shin * 0.36, -r * 0.22], scale: [1, 1.7, 1] }),
      paint(box(r * 1.1, shin * 0.42, r * 0.3), kit.socks, { at: [0, -shin * 0.5, r * 0.62] }),
    ]));
    const ankle = joint(knee, 0, -shin);
    const boot = look.boots;
    mesh(ankle, merge([
      paint(ball(0.06 * s, 12, 10), boot, { at: [0, -0.02 * s, 0.0], scale: [0.85, 0.75, 1] }),
      paint(ball(0.07 * s, 14, 10), boot, { at: [0, -0.035 * s, 0.09 * s], scale: [0.72, 0.55, 1.75] }),
      paint(box(0.085 * s, 0.018 * s, 0.26 * s), shade(boot, -0.6), { at: [0, -0.066 * s, 0.07 * s] }),
      paint(box(0.088 * s, 0.014 * s, 0.1 * s), shade(boot, 0.55), { at: [side * 0.004 * s, -0.02 * s, 0.07 * s], rot: [0.3, 0, 0] }),
    ]));
    return { hip, knee, ankle };
  };

  // The body faces +z, so its left side is +x.
  const L = arm(1);
  const R = arm(-1);
  const LL = leg(1);
  const RL = leg(-1);
  return {
    root, body, hips, spine, neck,
    shoulderL: L.shoulder, elbowL: L.elbow, handL: L.hand,
    shoulderR: R.shoulder, elbowR: R.elbow, handR: R.hand,
    hipL: LL.hip, kneeL: LL.knee, ankleL: LL.ankle,
    hipR: RL.hip, kneeR: RL.knee, ankleR: RL.ankle,
    hipHeight, height: look.height,
    dispose() {
      for (const g of geometries) g.dispose();
      shirt.dispose();
      shirtMap.dispose();
    },
  };
}
