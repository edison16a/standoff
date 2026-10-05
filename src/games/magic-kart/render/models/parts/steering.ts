import type * as THREE from "three";
import type { CharacterId } from "../../../characters";
import { emblemRegion } from "../kit/atlas-layout";
import { part } from "../kit/part";
import { capsule, disc, rbox, sphere, torus, tube } from "../kit/shapes";
import type { Rig } from "./driver-rig";

export interface GloveLook {
  glove: string;
  cuff: string;
}

/**
 * The steering wheel in wheel space: a leather rim with a coloured
 * twelve o'clock marker, three brushed spokes and a boss with the kart's
 * badge facing the driver. `toDriver` moves it into the driver's space.
 */
export function steeringWheel(rig: Rig, radius: number, accent: string, badge: CharacterId): THREE.BufferGeometry[] {
  const parts = [
    part(torus(radius, 0.022, 48, 10), "#1d1d22", { finish: "leather" }),
    part(torus(radius, 0.0235, 6, 10, 0.22), accent, { finish: "paint", rot: [0, 0, Math.PI / 2 - 0.11] }),
    part(tube(0.05, 0.055, 0.05, 24), "#2a2a30", { finish: "gunmetal", rot: [Math.PI / 2, 0, 0] }),
    part(disc(0.042, 24), "#ffffff", { finish: "paint", region: emblemRegion(badge), at: [0, 0, 0.026] }),
    part(tube(0.032, 0.032, 0.09, 16), "#3a3a42", { finish: "gunmetal", rot: [Math.PI / 2, 0, 0], at: [0, 0, -0.06] }),
  ];
  for (const a of [0, Math.PI, -Math.PI / 2]) {
    const len = radius - 0.04;
    parts.push(part(rbox(len, 0.03, 0.016, 0.007), "#c4c8d0", { finish: "brushed", at: [Math.cos(a) * (len / 2 + 0.03), Math.sin(a) * (len / 2 + 0.03), 0], rot: [0, 0, a] }));
  }
  return parts.map((g) => g.applyMatrix4(rig.wheelBasis));
}

/**
 * A gloved fist round the rim at each grip, with the thumb laid over the
 * top and a cuff at the wrist. In wheel space, then moved to the driver's.
 */
export function gloves(rig: Rig, look: GloveLook): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  for (const [grip, side] of [[rig.grips.L, -1], [rig.grips.R, 1]] as const) {
    const angle = Math.atan2(grip.y, grip.x);
    const at = (dx: number, dy: number, dz: number): [number, number, number] => [grip.x + dx, grip.y + dy, grip.z + dz];
    parts.push(part(sphere(0.06, 18, 14), look.glove, { finish: "leather", at: at(0, 0, 0.012), scale: [1.05, 1.3, 1.15], rot: [0, 0, angle] }));
    // Knuckles across the front of the rim.
    for (let k = 0; k < 4; k++) {
      const t = (k - 1.5) * 0.026;
      parts.push(part(sphere(0.02, 10, 8), look.glove, { finish: "leather", at: at(-Math.sin(angle) * t, Math.cos(angle) * t, -0.035) }));
    }
    parts.push(part(capsule(0.017, 0.05, 10), look.glove, { finish: "leather", at: at(-side * 0.01, 0.035, 0.03), rot: [0.6, 0, side * 0.9] }));
    parts.push(part(tube(0.045, 0.05, 0.05, 16), look.cuff, { finish: "cloth", at: at(side * -0.02, -0.03, 0.075), rot: [Math.PI / 2, 0, 0] }));
  }
  return parts.map((g) => g.applyMatrix4(rig.wheelBasis));
}
