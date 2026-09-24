import * as THREE from "three";
import type { BoxerMaterials } from "./materials";
import { sculpt, type Bump, type Ring } from "./sculpt";

/** Arm bones in metres. Each part hangs down its joint's -y. */
export const UPPER_ARM = 0.3;
export const FOREARM = 0.27;

function scaled(rings: readonly Ring[], bulk: number): Ring[] {
  return rings.map((r) => ({ ...r, rx: r.rx * bulk, zf: r.zf * bulk, zb: r.zb * bulk }));
}

const UPPER: readonly Ring[] = [
  // Closed over the top, so the tube never shows a hole from the camera above the shoulder.
  { t: 0, y: 0.05, rx: 0.012, zf: 0.012, zb: 0.012 },
  { t: 0.1, y: 0.03, rx: 0.048, zf: 0.046, zb: 0.048 },
  { t: 0.3, y: -0.08, rx: 0.058, zf: 0.06, zb: 0.058 },
  { t: 0.6, y: -0.17, rx: 0.054, zf: 0.058, zb: 0.052 },
  { t: 0.85, y: -0.25, rx: 0.047, zf: 0.046, zb: 0.046 },
  { t: 1, y: -0.315, rx: 0.036, zf: 0.034, zb: 0.036 },
];

const UPPER_MUSCLE: readonly Bump[] = [
  // Biceps in front, the horseshoe of the triceps behind.
  { theta: 0, t: 0.5, width: 0.7, height: 0.2, amount: 0.014 },
  { theta: Math.PI, t: 0.35, width: 0.8, height: 0.22, amount: 0.012 },
];

const FORE: readonly Ring[] = [
  { t: 0, y: 0.03, rx: 0.042, zf: 0.042, zb: 0.042 },
  { t: 0.25, y: -0.05, rx: 0.049, zf: 0.047, zb: 0.045 },
  { t: 0.7, y: -0.18, rx: 0.038, zf: 0.034, zb: 0.034 },
  { t: 1, y: -0.26, rx: 0.033, zf: 0.028, zb: 0.028 },
];

/** Deltoid and upper arm, hung from the shoulder. `side` is 1 for the boxer's left, which is +x. */
export function buildUpperArm(m: BoxerMaterials, side: 1 | -1): THREE.Group {
  const bulk = m.look.bulk;
  const group = new THREE.Group();
  group.add(new THREE.Mesh(sculpt(scaled(UPPER, bulk), { rows: 16, segments: 24, bumps: UPPER_MUSCLE }), m.skin));
  // The deltoid caps the shoulder, a little outward and forward.
  const delt = new THREE.Mesh(
    sculpt(
      scaled(
        [
          { t: 0, y: 0.06, rx: 0.01, zf: 0.01, zb: 0.01 },
          { t: 0.25, y: 0.045, rx: 0.058, zf: 0.06, zb: 0.058 },
          { t: 0.6, y: -0.02, rx: 0.07, zf: 0.07, zb: 0.066 },
          { t: 1, y: -0.13, rx: 0.042, zf: 0.045, zb: 0.04 },
        ],
        bulk,
      ),
      { rows: 12, segments: 24 },
    ),
    m.skin,
  );
  delt.position.set(side * 0.012, 0, 0.004);
  group.add(delt);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.038 * bulk, 14, 10), m.skin);
  elbow.position.y = -UPPER_ARM;
  group.add(elbow);
  return group;
}

export function buildForearm(m: BoxerMaterials): THREE.Mesh {
  const bumps: Bump[] = [{ theta: 0.8, t: 0.22, width: 0.6, height: 0.2, amount: 0.006 }];
  return new THREE.Mesh(sculpt(scaled(FORE, m.look.bulk), { rows: 12, segments: 20, bumps }), m.skin);
}

/**
 * A laced boxing glove on the wrist joint. Its local +z is the back of
 * the hand and -y runs out to the knuckles. The thumb sits on the inside,
 * which is -x for the left hand and +x for the right.
 */
export function buildGlove(m: BoxerMaterials, side: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  const shell = sculpt(
    [
      { t: 0, y: 0.075, rx: 0.046, zf: 0.044, zb: 0.044 },
      { t: 0.22, y: 0.02, rx: 0.049, zf: 0.047, zb: 0.046 },
      { t: 0.36, y: -0.02, rx: 0.058, zf: 0.062, zb: 0.05, z: 0.004 },
      { t: 0.62, y: -0.09, rx: 0.064, zf: 0.07, zb: 0.052, z: 0.006 },
      { t: 0.85, y: -0.145, rx: 0.056, zf: 0.062, zb: 0.045, z: 0.004 },
      { t: 1, y: -0.172, rx: 0.012, zf: 0.012, zb: 0.01, z: 0.002 },
    ],
    // The knuckle roll across the front of the fist.
    { rows: 22, segments: 32, bumps: [{ theta: 0, t: 0.8, width: 0.9, height: 0.08, amount: 0.006 }] },
  );
  group.add(new THREE.Mesh(shell, m.gloves));
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.07, 6, 12), m.gloves);
  thumb.position.set(-side * 0.056, -0.06, -0.012);
  thumb.rotation.set(0.35, 0, side * 0.3);
  group.add(thumb);
  // Laces down the palm side of the cuff, finished with a tape wrap.
  const lace = new THREE.CylinderGeometry(0.0028, 0.0028, 0.05, 5);
  for (let i = 0; i < 4; i++) {
    for (const tilt of [-1, 1]) {
      const piece = new THREE.Mesh(lace, m.laces);
      piece.position.set(0, 0.06 - i * 0.02, -0.046);
      piece.rotation.z = tilt * 0.9;
      group.add(piece);
    }
  }
  const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.022, 20, 1, true), m.laces);
  tape.position.y = 0.09;
  group.add(tape);
  return group;
}
