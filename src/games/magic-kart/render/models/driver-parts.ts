import type * as THREE from "three";
import { ball, box, cyl, paint, ring, type V3 } from "./geo";

export interface BodyColors {
  suit: string;
  trim: string;
  glove: string;
}

/**
 * The seated body every driver shares: hips in the seat, a rounded
 * torso, arms reaching forward to the wheel and gloved hands on it.
 * Built around the seat point, facing +z. Heads are each character's own.
 */
export function seatedBody(c: BodyColors, reach = 0.55): THREE.BufferGeometry[] {
  const parts = [
    paint(box(0.62, 0.28, 0.5, 0.12), c.suit, { at: [0, 0.14, 0.05] }),
    paint(box(0.56, 0.52, 0.4, 0.17), c.suit, { at: [0, 0.52, -0.02], rot: [-0.12, 0, 0] }),
    paint(box(0.58, 0.08, 0.42, 0.04), c.trim, { at: [0, 0.4, -0.02], rot: [-0.12, 0, 0] }),
    paint(cyl(0.16, 0.19, 0.1, 16), c.trim, { at: [0, 0.8, -0.02] }),
  ];
  for (const side of [-1, 1]) {
    // Upper arm down and forward, forearm out to the wheel rim.
    parts.push(paint(cyl(0.08, 0.075, 0.34, 10), c.suit, { at: [side * 0.33, 0.6, 0.1], rot: [1.1, 0, side * 0.25] }));
    parts.push(paint(cyl(0.07, 0.065, 0.32, 10), c.suit, { at: [side * 0.3, 0.52, reach - 0.15], rot: [1.45, 0, side * -0.15] }));
    parts.push(paint(ball(0.085, 10, 8), c.glove, { at: [side * 0.22, 0.52, reach], scale: [1, 0.9, 1.1] }));
    // Knees poke up in front of the seat.
    parts.push(paint(box(0.2, 0.2, 0.46, 0.09), c.suit, { at: [side * 0.15, 0.24, 0.4], rot: [0.25, 0, 0] }));
  }
  return parts;
}

/** A steering wheel on its column, tilted toward the driver. */
export function steeringWheel(at: V3, colour: string, hub: string): THREE.BufferGeometry[] {
  return [
    paint(ring(0.2, 0.035, 20, 8), colour, { at, rot: [-0.9, 0, 0] }),
    paint(box(0.36, 0.04, 0.05), colour, { at, rot: [-0.9, 0, 0] }),
    paint(cyl(0.06, 0.06, 0.05, 12), hub, { at, rot: [-0.9 + Math.PI / 2, 0, 0] }),
    paint(cyl(0.03, 0.03, 0.5, 8), "#2b2b33", { at: [at[0], at[1] - 0.15, at[2] + 0.2], rot: [-0.9, 0, 0] }),
  ];
}

/** A pair of round eyes with a highlight, the thing that makes a face read at a glance. */
export function eyes(at: V3, spread: number, size: number, iris = "#1b1b24"): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const x = at[0] + side * spread;
    parts.push(paint(ball(size, 14, 10), "#ffffff", { at: [x, at[1], at[2]] }));
    parts.push(paint(ball(size * 0.62, 12, 8), iris, { at: [x, at[1], at[2] + size * 0.5] }));
    parts.push(paint(ball(size * 0.2, 8, 6), "#ffffff", { at: [x + size * 0.2, at[1] + size * 0.25, at[2] + size * 0.95] }));
  }
  return parts;
}
