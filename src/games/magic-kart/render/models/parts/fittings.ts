import * as THREE from "three";
import type { CharacterId } from "../../../characters";
import type { V3 } from "../geo";
import { plateRegion, REGIONS } from "../kit/atlas-layout";
import { part, tint } from "../kit/part";
import { disc, pipe, plate, rbox, torus, tube } from "../kit/shapes";

const heatColors = [new THREE.Color("#c9ccd4"), new THREE.Color("#d9b46a"), new THREE.Color("#a1588f"), new THREE.Color("#3f5fb8")];

/**
 * An exhaust: a pipe bent through the given points with the heat bluing
 * of real titanium toward the end, a polished tip, and a glowing core
 * inside the tip that the model heats up on boost.
 */
export function exhaust(points: readonly V3[], r: number): THREE.BufferGeometry[] {
  const last = points[points.length - 1]!;
  const prev = points[points.length - 2]!;
  const dir = new THREE.Vector3(last[0] - prev[0], last[1] - prev[1], last[2] - prev[2]).normalize();
  const start = new THREE.Vector3(...points[0]!);
  const span = start.distanceTo(new THREE.Vector3(...last)) || 1;
  const body = tint(part(pipe(points, r, 48, 14), "#ffffff", { finish: "brushed" }), (p) => {
    // Straw to purple to blue the nearer the hot end, as titanium colours with heat.
    const t = Math.min(0.999, p.distanceTo(start) / span) * (heatColors.length - 1);
    const i = Math.floor(t);
    return heatColors[i]!.clone().lerp(heatColors[i + 1]!, t - i);
  });
  const tip = new THREE.Vector3(...last);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const at = (d: number): V3 => [tip.x + dir.x * d, tip.y + dir.y * d, tip.z + dir.z * d];
  const turned = (g: THREE.BufferGeometry, d: number) => g.applyQuaternion(q).translate(...at(d));
  return [
    body,
    part(turned(tube(r * 1.25, r * 1.1, 0.1, 18, true), 0.03), "#eef0f5", { finish: "chrome" }),
    part(turned(torus(r * 1.18, r * 0.12, 18, 6).rotateX(Math.PI / 2), 0.08), "#f4f4f8", { finish: "chrome" }),
    part(turned(tube(r * 0.95, r * 0.95, 0.01, 16), 0.04), "#ff7a1a", { finish: "heat" }),
  ];
}

/** A bucket seat: quilted cushion and back between padded bolsters, with a headrest. */
export function bucketSeat(at: V3, width: number, color: string, trim: string, tilt = -0.2): THREE.BufferGeometry[] {
  const [x, y, z] = at;
  const back: V3 = [x, y + 0.36, z - 0.26];
  return [
    part(rbox(width, 0.12, 0.5, 0.05), trim, { finish: "leather", at: [x, y, z] }),
    part(plate(width * 0.62, 0.4, 0.06, 0.02, 0.008), color, { finish: "leather", region: REGIONS.quilt, at: [x, y + 0.065, z + 0.02], rot: [-Math.PI / 2, 0, 0] }),
    part(rbox(width, 0.62, 0.11, 0.05), trim, { finish: "leather", at: back, rot: [tilt, 0, 0] }),
    part(plate(width * 0.62, 0.48, 0.06, 0.02, 0.008), color, { finish: "leather", region: REGIONS.quilt, at: [x, back[1], back[2] + 0.06], rot: [tilt, 0, 0] }),
    ...[-1, 1].map((side) => part(rbox(0.1, 0.5, 0.16, 0.05), trim, { finish: "leather", at: [x + side * (width / 2 - 0.02), back[1] - 0.02, back[2] + 0.07], rot: [tilt, 0, side * 0.12] })),
    part(rbox(width * 0.6, 0.16, 0.1, 0.05), trim, { finish: "leather", at: [x, back[1] + 0.38, back[2] - 0.08], rot: [tilt, 0, 0] }),
  ];
}

/** The race number plate on its backing, facing along `rot`. */
export function numberPlate(id: CharacterId, at: V3, rot: V3, width = 0.4): THREE.BufferGeometry[] {
  return [part(plate(width, width / 2, 0.04, 0.012, 0.005), "#ffffff", { finish: "paint", region: plateRegion(id), at, rot })];
}

/** A round headlamp: chrome bezel, a glowing reflector with fresnel rings, facing +z. */
export function headlamp(at: V3, r: number, rot: V3 = [0, 0, 0]): THREE.BufferGeometry[] {
  const g = (geo: THREE.BufferGeometry, color: string, finish: "chrome" | "head" | "gunmetal", region?: typeof REGIONS.lamp) =>
    part(geo, color, { finish, region, at, rot });
  return [
    g(tube(r * 1.15, r * 1.25, r * 0.6, 24).rotateX(Math.PI / 2).translate(0, 0, -r * 0.3), "#2a2a30", "gunmetal"),
    g(torus(r * 1.12, r * 0.16, 28, 8), "#f0f0f5", "chrome"),
    g(disc(r * 1.02, 28).translate(0, 0, 0.004), "#ffffff", "head", REGIONS.lamp),
  ];
}

/** A tail lamp lens that glows dimly, and brightly under braking. */
export function tailLamp(at: V3, w: number, h: number, rot: V3 = [0, Math.PI, 0]): THREE.BufferGeometry[] {
  return [
    part(rbox(w + 0.03, h + 0.03, 0.04, 0.015), "#18181c", { finish: "plastic", at, rot }),
    part(plate(w, h, Math.min(w, h) * 0.3, 0.01, 0.004), "#ffffff", { finish: "brake", region: REGIONS.tail, at, rot: [rot[0], rot[1], rot[2]] }),
  ];
}

/** A wing mirror on a stalk, glass facing back. */
export function mirror(at: V3, color: string): THREE.BufferGeometry[] {
  const [x, y, z] = at;
  return [
    part(tube(0.012, 0.012, 0.16, 8), "#2a2a30", { finish: "gunmetal", at: [x, y - 0.08, z] }),
    part(rbox(0.16, 0.1, 0.06, 0.03), color, { finish: "paint", at: [x, y + 0.02, z] }),
    part(rbox(0.13, 0.075, 0.01, 0.005), "#cfe8ff", { finish: "chrome", at: [x, y + 0.02, z - 0.032] }),
  ];
}
