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
  p.add(
    "neck",
    paint(ball(r, 8, 6), c.skin, { at: [0, d.head, 0], scale: [0.92, 1.05, 1] }),
    paint(box(0.035, 0.05, 0.02), c.eyes ?? "#111827", { at: [r * 0.38, d.head + r * 0.12, r * 0.9] }),
    paint(box(0.035, 0.05, 0.02), c.eyes ?? "#111827", { at: [-r * 0.38, d.head + r * 0.12, r * 0.9] }),
  );
  for (const side of ["L", "R"] as const) {
    const fore = s.longSleeves ? c.sleeve : c.skin;
    p.add(`shoulder${side}`, paint(knob(s.arm * 1.25), c.sleeve), paint(limb(s.arm * 1.15, s.arm, d.upper), c.sleeve));
    p.add(`elbow${side}`, paint(knob(s.arm * 0.95), fore), paint(limb(s.arm * 0.95, s.arm * 0.8, d.fore), fore));
    p.add(`hand${side}`, paint(ball(s.arm * 1.15, 6, 5), c.skin, { at: [0, -0.04, 0.01] }));
    const flare = s.flare ?? 1;
    p.add(`hip${side}`, paint(limb(s.leg * 1.2 * flare, s.leg * flare, d.thigh), c.pants));
    p.add(`knee${side}`, paint(knob(s.leg * flare), c.pants), paint(limb(s.leg * flare, s.leg * 0.8 * flare, d.shin), c.pants));
    p.add(`ankle${side}`, paint(box(s.leg * 1.5, 0.08, 0.26), c.feet, { at: [0, -0.04, 0.06] }));
  }
}
