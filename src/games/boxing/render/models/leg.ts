import * as THREE from "three";
import type { BoxerMaterials } from "./materials";
import { sculpt, type Bump, type Ring } from "./sculpt";

/** Leg bones in metres, hip to knee and knee to ankle. */
export const THIGH = 0.44;
export const SHIN = 0.43;
/** The ankle sits this high over the sole. */
export const ANKLE_HEIGHT = 0.075;

const THIGH_RINGS: readonly Ring[] = [
  { t: 0, y: 0.04, rx: 0.085, zf: 0.085, zb: 0.09 },
  { t: 0.35, y: -0.14, rx: 0.08, zf: 0.088, zb: 0.078 },
  { t: 0.75, y: -0.33, rx: 0.062, zf: 0.066, zb: 0.058 },
  { t: 1, y: -0.45, rx: 0.052, zf: 0.055, zb: 0.05 },
];

const THIGH_MUSCLE: readonly Bump[] = [
  { theta: 0.25, t: 0.45, width: 0.6, height: 0.25, amount: 0.012 },
  { theta: 0.9, t: 0.75, width: 0.3, height: 0.12, amount: 0.008 },
];

/** Like the forearm, it narrows into the joint so a bent knee shows no end. */
const SHIN_RINGS: readonly Ring[] = [
  { t: 0, y: 0, rx: 0.04, zf: 0.042, zb: 0.04 },
  { t: 0.1, y: -0.035, rx: 0.052, zf: 0.052, zb: 0.052 },
  { t: 0.3, y: -0.1, rx: 0.052, zf: 0.045, zb: 0.064 },
  { t: 0.7, y: -0.3, rx: 0.038, zf: 0.036, zb: 0.04 },
  { t: 1, y: -0.44, rx: 0.032, zf: 0.032, zb: 0.032 },
];

/** Thigh with its flared satin trunk leg, hung from the hip. `side` is 1 for the boxer's left (+x). */
export function buildThigh(m: BoxerMaterials, side: 1 | -1): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(sculpt(THIGH_RINGS, { rows: 14, segments: 24, bumps: THIGH_MUSCLE }), m.skin));
  const leg = sculpt(
    [
      { t: 0, y: 0.1, rx: 0.1, zf: 0.1, zb: 0.1, x: side * -0.01 },
      { t: 0.6, y: -0.1, rx: 0.115, zf: 0.112, zb: 0.118, x: side * 0.008 },
      { t: 1, y: -0.2, rx: 0.12, zf: 0.115, zb: 0.12, x: side * 0.012 },
    ],
    { rows: 8, segments: 32 },
  );
  group.add(new THREE.Mesh(leg, m.trunks));
  const knee = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), m.skin);
  knee.position.set(0, -THIGH, 0.01);
  group.add(knee);
  return group;
}

/** Shin and calf with the sock and the high boot's upper, hung from the knee. */
export function buildShin(m: BoxerMaterials): THREE.Group {
  const group = new THREE.Group();
  const calf: Bump[] = [{ theta: Math.PI, t: 0.28, width: 0.8, height: 0.18, amount: 0.016 }];
  group.add(new THREE.Mesh(sculpt(SHIN_RINGS, { rows: 14, segments: 22, bumps: calf }), m.skin));
  const boot = sculpt(
    [
      { t: 0, y: -0.2, rx: 0.046, zf: 0.046, zb: 0.05 },
      { t: 0.5, y: -0.33, rx: 0.042, zf: 0.044, zb: 0.045 },
      { t: 1, y: -SHIN, rx: 0.044, zf: 0.05, zb: 0.048 },
    ],
    { rows: 6, segments: 24 },
  );
  group.add(new THREE.Mesh(boot, m.shoes));
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20, 1, true), m.socks);
  sock.position.y = -0.195;
  group.add(sock);
  return group;
}

/** The boot's foot, on a joint at the ankle that stays level with the canvas. Toes point +z. */
export function buildFoot(m: BoxerMaterials): THREE.Group {
  const group = new THREE.Group();
  const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 6, 14), m.shoes);
  shoe.rotation.x = Math.PI / 2;
  shoe.scale.set(1, 1, 0.75);
  shoe.position.set(0, -ANKLE_HEIGHT + 0.042, 0.05);
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.25), m.sole);
  sole.position.set(0, -ANKLE_HEIGHT + 0.007, 0.05);
  group.add(shoe, sole);
  return group;
}
