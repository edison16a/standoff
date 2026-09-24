import type * as THREE from "three";
import { ball, box, cyl, lathe, merge, paint } from "./geo";

export interface WheelStyle {
  radius: number;
  width: number;
  tire: string;
  rim: string;
  hub: string;
  spokes: number;
  /** Fat rounded buggy tyres instead of flat kart slicks. */
  balloon?: boolean;
  /** Chunky tread blocks, for off road looks. */
  knobbly?: boolean;
}

/**
 * One wheel with its axle along x and the rim facing +x: a tyre turned
 * from a cross section, tread blocks round the outside, a dished rim,
 * spokes and a hub cap. The model turns it round for the other side.
 */
export function buildWheel(style: WheelStyle): THREE.BufferGeometry {
  const { radius: r, width: w } = style;
  const inner = r * (style.balloon ? 0.55 : 0.64);
  const half = w / 2;
  const section: [number, number][] = style.balloon
    ? [[inner, -half * 0.8], [r * 0.82, -half], [r * 0.97, -half * 0.75], [r, -half * 0.3], [r, half * 0.3], [r * 0.97, half * 0.75], [r * 0.82, half], [inner, half * 0.8]]
    : [[inner, -half], [r * 0.93, -half], [r, -half * 0.8], [r, half * 0.8], [r * 0.93, half], [inner, half]];
  const tire = lathe(section, 28);
  tire.rotateZ(Math.PI / 2);
  const parts = [paint(tire, style.tire)];

  const lugs = style.knobbly ? 14 : 20;
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    const offset = (i % 2 === 0 ? 1 : -1) * w * 0.14;
    const size = style.knobbly ? 0.1 : 0.05;
    parts.push(paint(box(w * (style.knobbly ? 0.45 : 0.6), size, r * 0.18), style.tire, {
      at: [offset, Math.cos(a) * r, Math.sin(a) * r],
      rot: [-a, 0, 0],
    }));
  }

  // The dish, set in from the sidewall so the tyre frames it.
  const dish = lathe([[0.001, half * 0.2], [inner * 0.35, half * 0.3], [inner * 0.9, half * 0.1], [inner, -half * 0.3]], 24);
  dish.rotateZ(-Math.PI / 2);
  parts.push(paint(dish, style.rim));
  for (let i = 0; i < style.spokes; i++) {
    const a = (i / style.spokes) * Math.PI * 2;
    parts.push(paint(box(0.05, inner * 0.85, inner * 0.16), style.rim, {
      at: [half * 0.32, Math.cos(a) * inner * 0.45, Math.sin(a) * inner * 0.45],
      rot: [-a, 0, 0],
    }));
  }
  parts.push(paint(cyl(inner * 0.28, inner * 0.32, 0.08, 14), style.hub, { at: [half * 0.36, 0, 0], rot: [0, 0, -Math.PI / 2] }));
  parts.push(paint(ball(inner * 0.12, 10, 8), style.rim, { at: [half * 0.42, 0, 0] }));
  return merge(parts);
}
