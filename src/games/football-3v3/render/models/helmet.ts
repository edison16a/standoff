import * as THREE from "three";
import type { KitSpec } from "./kit";
import { ball, box, capsule, merge, paint, rod, shade, torus, type V3 } from "./geo";

/** The shell's radius in metres before the player's size is applied. */
export const SHELL = 0.148;

export interface HelmetParts {
  /** Shell, face, stripe, mask and straps in one painted geometry. */
  body: THREE.BufferGeometry;
  /** A tinted visor wears its own glassy material, or null without one. */
  visor: THREE.BufferGeometry | null;
}

/** Points round the front of the helmet at one height, for the bars of the face mask. */
function arc(radius: number, y: number, half: number, steps: number, zShift = 0): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -half + (2 * half * i) / steps;
    out.push([Math.sin(a) * radius, y, Math.cos(a) * radius + zShift]);
  }
  return out;
}

function bars(points: V3[], r: number, hex: string): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 1; i < points.length; i++) out.push(rod(points[i - 1]!, points[i]!, r, hex, 6));
  return out;
}

/**
 * A football helmet round the head, which faces +z. The face peeks out
 * of the shell's opening and the mask bars sit in front of it. Open
 * masks have two bars, cages a full grid, and visors add tinted glass
 * across the eyes. The team stripe runs over the crown.
 */
export function buildHelmet(kit: KitSpec): HelmetParts {
  const R = SHELL;
  const look = kit.look;
  const mask = look.mask === "cage" ? "#d8d8d8" : "#9aa3ad";
  const parts: THREE.BufferGeometry[] = [
    // The shell sits a little back and high on the head, flaring over the ears.
    paint(ball(R, 22, 16), kit.helmet, { at: [0, 0.01, -0.012], scale: [1, 1.0, 1.12] }),
    // The face in the opening, with a jaw below the shell's rim.
    paint(ball(0.086, 14, 10), look.skin, { at: [0, -0.035, 0.078], scale: [0.95, 1.12, 0.8] }),
    paint(ball(0.06, 12, 8), look.skin, { at: [0, -0.085, 0.06], scale: [1.1, 0.8, 1] }),
    // The eyes as dark slots under the brim.
    paint(box(0.11, 0.022, 0.02), "#161616", { at: [0, -0.012, 0.142] }),
    // The crown stripe from the brow to the back.
    paint(torus(R + 0.004, 0.018, 24, 4, Math.PI * 0.95), kit.stripe, { rot: [0, Math.PI / 2, 0], scale: [1.12, 1, 1], at: [0, 0.012, -0.02] }),
    // Side logos: a disc in the trim colour on each ear.
    paint(ball(0.052, 12, 8), kit.stripe, { at: [R * 0.96, 0.0, -0.02], scale: [0.18, 1, 1] }),
    paint(ball(0.052, 12, 8), kit.stripe, { at: [-R * 0.96, 0.0, -0.02], scale: [0.18, 1, 1] }),
    // Ear holes and the chin strap.
    paint(ball(0.018, 8, 6), shade(kit.helmet, -0.5), { at: [R * 1.0, -0.035, 0.0], scale: [0.4, 1, 1] }),
    paint(ball(0.018, 8, 6), shade(kit.helmet, -0.5), { at: [-R * 1.0, -0.035, 0.0], scale: [0.4, 1, 1] }),
    paint(capsule(0.03, 0.03, 8), "#f4f4f4", { at: [0, -0.13, 0.095], rot: [0, 0, Math.PI / 2], scale: [0.7, 1, 0.55] }),
  ];
  // The mask: bars round the front, joined to the shell at the sides.
  const front = R * 1.18;
  const rows = look.mask === "cage" ? [-0.028, -0.075, -0.12] : [-0.05, -0.11];
  for (const y of rows) parts.push(...bars(arc(front - (y < -0.1 ? 0.018 : 0), y, 0.95, 8, -0.02), 0.0075, mask));
  const top = rows[0]!;
  const bottom = rows[rows.length - 1]!;
  const uprights = look.mask === "cage" ? [-0.2, 0.2] : [0];
  for (const a of uprights) parts.push(rod([Math.sin(a) * front, top + 0.01, Math.cos(a) * front - 0.02], [Math.sin(a) * (front - 0.018), bottom - 0.005, Math.cos(a) * (front - 0.018) - 0.02], 0.007, mask, 6));
  if (kit.eyeBlack) for (const x of [-0.034, 0.034]) parts.push(paint(box(0.03, 0.012, 0.01), "#0a0a0a", { at: [x, -0.042, 0.146] }));
  if (kit.locks) {
    // Locks fall from under the back of the shell onto the pads.
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.028;
      parts.push(paint(capsule(0.014, 0.12 + (i % 2) * 0.03, 6), kit.locks, { at: [x, -0.16, -0.13 + Math.abs(x) * 0.3], rot: [-0.35, 0, x * 1.5] }));
    }
  }
  const visor = look.visor
    ? paint(new THREE.SphereGeometry(R * 1.06, 18, 6, Math.PI / 2 - 0.8, 1.6, Math.PI * 0.47, Math.PI * 0.12), look.visor, { at: [0, 0.005, -0.004], scale: [1, 1, 1.1] })
    : null;
  return { body: merge(parts), visor };
}
