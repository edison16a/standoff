import type * as THREE from "three";
import type { V3 } from "../geo";
import { part } from "../kit/part";
import { bar, between, rbox, spring, tube } from "../kit/shapes";

/** Where the running gear meets the wheels and the frame. */
export interface GearSpec {
  /** Front and rear wheel centres on the right (+x) side; the left mirrors them. */
  front: V3;
  rear: V3;
  frontWidth: number;
  rearWidth: number;
  /** Half the width of the frame rails the arms bolt to. */
  rail: number;
  /** Height of the frame rails. */
  floor: number;
  spring: string;
  frame: string;
}

const STEEL = "#b9bec8";
const DARK = "#2a2a30";

/** A coilover: damper body, polished shaft, a coloured coil and an eye at each end. */
export function coilover(a: V3, b: V3, coil: string): THREE.BufferGeometry[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const lerp = (t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const coilGeo = spring(0.045, 0.009, len * 0.62, 6);
  coilGeo.translate(0, -len * 0.31, 0);
  return [
    part(between(tube(0.026, 0.026, len * 0.55, 12), lerp(0.45), b), "#d8a52a", { finish: "brushed" }),
    part(between(tube(0.012, 0.012, len * 0.5, 8), a, lerp(0.5)), STEEL, { finish: "chrome" }),
    part(between(coilGeo, lerp(0.19), lerp(0.81)), coil, { finish: "paint" }),
    part(between(tube(0.03, 0.03, 0.02, 12), lerp(0.18), lerp(0.2)), DARK, { finish: "gunmetal" }),
    part(between(tube(0.03, 0.03, 0.02, 12), lerp(0.8), lerp(0.82)), DARK, { finish: "gunmetal" }),
  ];
}

/**
 * The visible chassis under the bodywork, right side only (the caller
 * mirrors it): double wishbones and a coilover to each front hub, a
 * steering knuckle and track rod, and at the back a bearing carrier and
 * coilover on the live axle. The axle itself spans both sides, so it is
 * built by `rearAxle`.
 */
export function suspension(s: GearSpec): THREE.BufferGeometry[] {
  const [fx, fy, fz] = s.front;
  const hub = fx - s.frontWidth / 2 - 0.05;
  const parts: THREE.BufferGeometry[] = [
    // Knuckle the wheel turns on.
    part(rbox(0.06, 0.2, 0.09, 0.02), DARK, { finish: "gunmetal", at: [hub, fy, fz] }),
    part(between(tube(0.03, 0.03, 0.06, 12), [hub, fy, fz], [hub + 0.06, fy, fz]), STEEL, { finish: "brushed" }),
  ];
  for (const [y, spread] of [[fy + 0.08, 0.16], [fy - 0.07, 0.22]] as const) {
    parts.push(part(bar([s.rail, y, fz - spread], [hub, y, fz], 0.016), s.frame, { finish: "metallic" }));
    parts.push(part(bar([s.rail, y, fz + spread * 0.6], [hub, y, fz], 0.016), s.frame, { finish: "metallic" }));
  }
  parts.push(part(bar([s.rail * 0.4, fy - 0.02, fz + 0.1], [hub, fy - 0.02, fz + 0.08], 0.011), STEEL, { finish: "chrome" }));
  parts.push(...coilover([hub - 0.08, fy - 0.06, fz - 0.02], [s.rail + 0.02, fy + 0.3, fz - 0.1], s.spring));
  const [rx, ry, rz] = s.rear;
  const carrier = rx - s.rearWidth / 2 - 0.08;
  parts.push(part(rbox(0.08, 0.16, 0.16, 0.03), DARK, { finish: "gunmetal", at: [carrier, ry, rz] }));
  parts.push(...coilover([carrier, ry + 0.06, rz + 0.04], [s.rail + 0.04, ry + 0.4, rz + 0.18], s.spring));
  // A trailing arm from the frame to the carrier.
  parts.push(part(bar([s.rail, s.floor, rz + 0.55], [carrier, ry - 0.02, rz], 0.018), s.frame, { finish: "metallic" }));
  return parts;
}

/** The live rear axle across both wheels, with its brake disc and drive sprocket in the middle. */
export function rearAxle(s: GearSpec): THREE.BufferGeometry[] {
  const [rx, ry, rz] = s.rear;
  const end = rx - s.rearWidth / 2;
  return [
    part(bar([-end, ry, rz], [end, ry, rz], 0.032, 16), STEEL, { finish: "brushed" }),
    part(between(tube(0.16, 0.16, 0.018, 32), [0.12, ry, rz], [0.14, ry, rz]), "#a8a8b0", { finish: "brushed" }),
    part(rbox(0.05, 0.1, 0.12, 0.015), "#c8202a", { finish: "paint", at: [0.13, ry + 0.15, rz] }),
    part(between(tube(0.13, 0.13, 0.016, 24), [-0.16, ry, rz], [-0.14, ry, rz]), DARK, { finish: "gunmetal" }),
  ];
}
