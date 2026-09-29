import type * as THREE from "three";
import { joint, type Mesher } from "./joint";
import { ball, box, cyl, merge, paint, shade, torus } from "./geo";
import type { KitSpec } from "./kit";

export interface Limbs {
  shoulderL: THREE.Object3D;
  elbowL: THREE.Object3D;
  handL: THREE.Object3D;
  shoulderR: THREE.Object3D;
  elbowR: THREE.Object3D;
  handR: THREE.Object3D;
  hipL: THREE.Object3D;
  kneeL: THREE.Object3D;
  ankleL: THREE.Object3D;
  hipR: THREE.Object3D;
  kneeR: THREE.Object3D;
  ankleR: THREE.Object3D;
  legLength: number;
}

/**
 * Arms and legs. Sleeves are bare, short or long in the build's
 * accent colour; gloves match the accent. Pants run to just below the
 * knee with a team stripe down the side, then socks and cleats.
 */
export function buildLimbs(kit: KitSpec, s: number, torsoH: number, spine: THREE.Object3D, hips: THREE.Object3D, mesh: Mesher): Limbs {
  const b = kit.build;
  const look = kit.look;
  const shoulderX = (0.2 + 0.035 * b) * s;
  const arm = (side: -1 | 1) => {
    const shoulder = joint(spine, side * shoulderX, torsoH - 0.1 * s);
    const upper = 0.29 * s;
    const fore = 0.27 * s;
    const r = (0.058 + 0.024 * b) * s;
    const upperSkin = kit.sleeves === "long" ? look.accent : look.skin;
    const sleeve = kit.sleeves === "bare" ? upper * 0.28 : upper * 0.5;
    mesh(shoulder, merge([
      paint(ball(r * 1.35, 12, 10), kit.jersey, { scale: [1, 0.95, 1.05] }),
      paint(cyl(r * 1.3, r * 1.2, sleeve, 12), kit.jersey, { at: [0, -sleeve / 2, 0] }),
      paint(torus(r * 1.2, r * 0.12, 14, 4), kit.trim, { at: [0, -sleeve + r * 0.1, 0], rot: [Math.PI / 2, 0, 0] }),
      paint(ball(r * 1.02, 12, 10), upperSkin, { at: [0, -upper * 0.55, r * 0.08], scale: [1, 1.7, 1] }),
      paint(cyl(r * 0.86, r * 0.8, upper * 0.4, 10), upperSkin, { at: [0, -upper * 0.8, 0] }),
    ]));
    const elbow = joint(shoulder, 0, -upper);
    const forearm = kit.sleeves === "long" ? look.accent : look.skin;
    mesh(elbow, merge([
      paint(ball(r * 0.84, 10, 8), forearm),
      paint(ball(r * 0.88, 10, 8), forearm, { at: [0, -fore * 0.3, r * 0.05], scale: [1, 1.9, 1] }),
      // Tape round the wrist, then a padded glove.
      paint(cyl(r * 0.7, r * 0.66, fore * 0.22, 10), "#f2f2f0", { at: [0, -fore * 0.84, 0] }),
      paint(ball(r * 0.86, 12, 10), look.accent, { at: [0, -fore - r * 0.72, r * 0.1], scale: [0.9, 1.35, 0.66] }),
      paint(ball(r * 0.36, 8, 6), look.accent, { at: [side * -r * 0.38, -fore - r * 0.4, r * 0.48], scale: [0.8, 1.4, 0.8] }),
    ]));
    const hand = joint(elbow, 0, -fore - r);
    return { shoulder, elbow, hand };
  };

  const hipW = (0.1 + 0.02 * b) * s;
  const thigh = 0.45 * s;
  const shin = 0.44 * s;
  const leg = (side: -1 | 1) => {
    const hip = joint(hips, side * hipW, -0.02 * s);
    const r = (0.08 + 0.03 * b) * s;
    mesh(hip, merge([
      paint(ball(r * 1.3, 12, 10), kit.pants, { at: [0, -thigh * 0.5, r * 0.1], scale: [1, 2.3, 1.05] }),
      paint(box(r * 0.12, thigh * 0.8, r * 0.34), kit.jersey, { at: [side * r * 1.25, -thigh * 0.5, r * 0.1] }),
      // The knee pad is a hard bump at the front of the pants.
      paint(ball(r * 0.95, 10, 8), shade(kit.pants, -0.08), { at: [0, -thigh, r * 0.3], scale: [1, 1.1, 0.85] }),
    ]));
    const knee = joint(hip, 0, -thigh);
    mesh(knee, merge([
      paint(cyl(r * 0.92, r * 0.84, shin * 0.18, 12), kit.pants, { at: [0, -shin * 0.06, 0] }),
      paint(cyl(r * 0.88, r * 0.58, shin * 0.8, 12), kit.socks, { at: [0, -shin * 0.55, 0] }),
      paint(cyl(r * 0.9, r * 0.84, shin * 0.07, 12), kit.trim, { at: [0, -shin * 0.3, 0] }),
      paint(ball(r * 0.8, 12, 10), kit.socks, { at: [0, -shin * 0.4, -r * 0.22], scale: [1, 1.7, 1] }),
    ]));
    const ankle = joint(knee, 0, -shin);
    const cleat = look.cleats;
    mesh(ankle, merge([
      paint(ball(0.064 * s, 12, 10), cleat, { at: [0, -0.02 * s, 0], scale: [0.9, 0.85, 1] }),
      paint(ball(0.072 * s, 14, 10), cleat, { at: [0, -0.035 * s, 0.09 * s], scale: [0.75, 0.55, 1.75] }),
      paint(box(0.09 * s, 0.022 * s, 0.27 * s), shade(cleat, cleat === "#111111" ? 0.15 : -0.5), { at: [0, -0.068 * s, 0.07 * s] }),
      // White spat tape over the ankle, as skill players wear.
      paint(cyl(0.066 * s, 0.07 * s, 0.05 * s, 12), "#f4f4f2", { at: [0, 0.02 * s, 0] }),
    ]));
    return { hip, knee, ankle };
  };

  // The body faces +z, so its left side is +x.
  const L = arm(1);
  const R = arm(-1);
  const LL = leg(1);
  const RL = leg(-1);
  return {
    shoulderL: L.shoulder, elbowL: L.elbow, handL: L.hand,
    shoulderR: R.shoulder, elbowR: R.elbow, handR: R.hand,
    hipL: LL.hip, kneeL: LL.knee, ankleL: LL.ankle,
    hipR: RL.hip, kneeR: RL.knee, ankleR: RL.ankle,
    legLength: thigh + shin,
  };
}
