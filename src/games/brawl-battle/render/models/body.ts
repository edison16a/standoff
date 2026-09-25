import * as THREE from "three";
import { ball, box, cyl, knob, limb, paint } from "./geo";
import type { Dims, PartList } from "./rig";

/** The colours of a human fighter's body, from head to toe. */
export interface BodyPalette {
  skin: string;
  chest: string;
  /** Upper sleeves, and forearms when `longSleeves`. */
  sleeve: string;
  pants: string;
  feet: string;
  eyes?: string;
  /** Eyebrows, and the mouth line. */
  brows?: string;
}

export interface BodyShape {
  /** Chest radius at the shoulders and at the waist. */
  chest: number;
  waist: number;
  /** Arm and leg thickness. */
  arm: number;
  leg: number;
  longSleeves?: boolean;
  /** Wider trouser legs, like a gi or hakama. */
  flare?: number;
}

/** Blends a colour toward a player's tint, for duplicate fighters. */
export function tinted(base: string, tint: string | null, k: number): string {
  if (!tint) return base;
  return `#${new THREE.Color(base).lerp(new THREE.Color(tint), k).getHexString()}`;
}

/**
 * The shared human body: pelvis, chest, head with eyes, arms ending in
 * fists, legs ending in feet. Each fighter dresses it with their own
 * hair, hats, armour and weapons on top.
 */
export function humanBody(p: PartList, d: Dims, c: BodyPalette, s: BodyShape): void {
  p.add("hips", paint(cyl(s.waist * 1.02, s.waist * 1.06, 0.2), c.pants, { at: [0, -0.02, 0], scale: [1, 1, 0.8] }));
  p.add(
    "torso",
    paint(cyl(s.chest, s.waist, d.torso * 0.92, 7), c.chest, { at: [0, d.torso * 0.48, 0], scale: [1, 1, 0.72] }),
    paint(cyl(0.07, 0.08, 0.12, 5), c.skin, { at: [0, d.torso + 0.02, 0] }),
  );
  const r = d.headR;
  const h = d.head;
  const eye = c.eyes ?? "#111827";
  const brow = c.brows ?? "#1f2937";
  p.add(
    "neck",
    paint(ball(r, 10, 7), c.skin, { at: [0, h, 0], scale: [0.94, 1.04, 1] }),
    // Big cartoon eyes under heavy, fierce brows, so faces read from across the stage.
    ...[1, -1].flatMap((x) => [
      paint(box(r * 0.36, r * 0.44, 0.02), "#ffffff", { at: [x * r * 0.36, h + r * 0.1, r * 0.9] }),
      paint(box(r * 0.2, r * 0.32, 0.02), eye, { at: [x * r * 0.32, h + r * 0.08, r * 0.93] }),
      paint(box(r * 0.5, r * 0.13, 0.03), brow, { at: [x * r * 0.36, h + r * 0.42, r * 0.9], rot: [0, 0, x * -0.28] }),
      paint(ball(r * 0.22, 5, 4), c.skin, { at: [x * r * 0.95, h + r * 0.02, -r * 0.05], scale: [0.5, 1, 0.8] }),
    ]),
    paint(box(r * 0.2, r * 0.26, r * 0.2), c.skin, { at: [0, h - r * 0.12, r * 0.98] }),
    paint(box(r * 0.46, r * 0.08, 0.02), "#7f1d1d", { at: [0, h - r * 0.48, r * 0.87] }),
  );
  for (const side of ["L", "R"] as const) {
    const fore = s.longSleeves ? c.sleeve : c.skin;
    p.add(`shoulder${side}`, paint(knob(s.arm * 1.25), c.sleeve), paint(limb(s.arm * 1.15, s.arm, d.upper), c.sleeve));
    p.add(`elbow${side}`, paint(knob(s.arm * 0.95), fore), paint(limb(s.arm * 0.95, s.arm * 0.8, d.fore), fore));
    // A chunky fist with the thumb wrapped over the front.
    p.add(`hand${side}`, paint(ball(s.arm * 1.35, 7, 5), c.skin, { at: [0, -0.05, 0.01], scale: [0.9, 1, 1] }), paint(box(s.arm * 0.7, s.arm * 0.6, s.arm * 0.6), c.skin, { at: [0, -0.03, s.arm * 1.1] }));
    const flare = s.flare ?? 1;
    p.add(`hip${side}`, paint(limb(s.leg * 1.2 * flare, s.leg * flare, d.thigh), c.pants));
    p.add(`knee${side}`, paint(knob(s.leg * flare), c.pants), paint(limb(s.leg * flare, s.leg * 0.8 * flare, d.shin), c.pants));
    p.add(`ankle${side}`, paint(box(s.leg * 1.7, 0.09, 0.29), c.feet, { at: [0, -0.04, 0.07] }));
  }
}
