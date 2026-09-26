import * as THREE from "three";
import { ball, box, cyl, paint, rod, roundBox, shade, torus } from "../geo";
import { FIELD_COLOURS as C } from "../palette";
import { buildBody, kneePads } from "./body";
import type { Kit, Outfit } from "./outfit";
import type { Rig } from "./rig";

/** A band of a cylinder round the front of the head, for goggle lenses and visors. */
export function wrap(r: number, h: number, arc: number, seg = 20): THREE.BufferGeometry {
  // Angle 0 is +z, the face: the arc starts half its width round from the front.
  return new THREE.CylinderGeometry(r, r, h, seg, 1, true, -arc / 2, arc);
}

/**
 * The Paintball Pro: a loose padded jersey in the team colour with a
 * chest band in the player's own colour, a full paintball mask with a
 * mirrored goggle lens and a vented mouth piece, and a pod pack on the
 * back of the harness.
 */
export function buildPro(rig: Rig, o: Outfit, kit: Kit): void {
  const s = rig.size.s;
  buildBody(rig, o, {
    top: kit.team,
    trim: kit.dark,
    sleeve: kit.team,
    forearm: kit.team,
    glove: C.charcoal,
    pants: kit.dark,
    boot: C.white,
    sole: C.charcoal,
    skin: kit.skin,
    chestWidth: 1.06,
    chestDepth: 1.05,
    loose: true,
  });
  kneePads(rig, o, C.charcoal);

  // Padding ribs over the shoulders and the chest band in the player's colour.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) o.add(rig.chest, "cloth", paint(roundBox(0.12 * s, 0.026 * s, 0.2 * s, 0.012 * s), kit.dark, { at: [side * 0.12 * s, 0.27 * s - i * 0.03 * s, 0], rot: [0, 0, side * 0.35] }));
  }
  o.add(rig.chest, "cloth", paint(cyl(0.2 * s, 0.2 * s, 0.05 * s, 22), kit.player, { at: [0, 0.14 * s, 0], scale: [1.13, 1, 0.8] }));
  // Sleeve stripes and padded forearm guards.
  for (const sh of [rig.shoulderL, rig.shoulderR]) o.add(sh, "cloth", paint(torus(0.066 * s, 0.012 * s, 16, 6), kit.player, { at: [0, -0.2 * s, 0], rot: [Math.PI / 2, 0, 0] }));
  for (const el of [rig.elbowL, rig.elbowR]) o.add(el, "cloth", paint(roundBox(0.075 * s, 0.14 * s, 0.07 * s, 0.03 * s), kit.dark, { at: [0, -0.12 * s, -0.012 * s] }));

  // The harness: a belt, and a pack of pods standing up behind.
  o.add(rig.pelvis, "gear", paint(cyl(0.175 * s, 0.175 * s, 0.06 * s, 20), C.strap, { at: [0, 0.05 * s, 0], scale: [1, 1, 0.8] }));
  o.add(rig.spine, "gear", paint(roundBox(0.24 * s, 0.14 * s, 0.07 * s, 0.03 * s), C.charcoal, { at: [0, -0.02 * s, -0.15 * s] }));
  for (let i = 0; i < 4; i++) {
    const x = (-0.09 + i * 0.06) * s;
    o.add(rig.spine, "gear", paint(cyl(0.026 * s, 0.026 * s, 0.2 * s, 10), "#e9eef2", { at: [x, 0.1 * s, -0.19 * s], rot: [-0.25, 0, 0] }));
    o.add(rig.spine, "gear", paint(cyl(0.029 * s, 0.029 * s, 0.03 * s, 10), kit.player, { at: [x, 0.205 * s, -0.215 * s], rot: [-0.25, 0, 0] }));
  }

  // The mask: a shell over the head, the goggle lens, a visor, the mouth vent and ear pieces.
  const h = rig.head;
  o.add(h, "skin", paint(ball(0.1 * s, 16, 12), kit.skin, { scale: [0.95, 1.08, 1] }));
  o.add(h, "gear", paint(ball(0.114 * s, 18, 14), C.charcoal, { at: [0, 0.01 * s, -0.012 * s], scale: [1, 1.05, 1.02] }));
  o.add(h, "lens", paint(wrap(0.118 * s, 0.056 * s, 2.4), shade(kit.player, -0.35), { at: [0, 0.018 * s, 0.004 * s], scale: [1, 1, 1.02] }));
  o.add(h, "gear", paint(roundBox(0.19 * s, 0.018 * s, 0.07 * s, 0.008 * s), kit.team, { at: [0, 0.058 * s, 0.1 * s], rot: [-0.25, 0, 0] }));
  o.add(h, "gear", paint(roundBox(0.1 * s, 0.075 * s, 0.07 * s, 0.03 * s), kit.team, { at: [0, -0.055 * s, 0.085 * s], rot: [0.25, 0, 0] }));
  for (let i = 0; i < 3; i++) o.add(h, "gear", paint(box(0.06 * s, 0.006 * s, 0.01 * s), C.strap, { at: [0, (-0.04 - i * 0.017) * s, 0.122 * s], rot: [0.25, 0, 0] }));
  for (const side of [-1, 1]) o.add(h, "gear", paint(cyl(0.04 * s, 0.04 * s, 0.03 * s, 14), kit.team, { at: [side * 0.112 * s, 0.005 * s, 0.01 * s], rot: [0, 0, Math.PI / 2] }));
  o.add(h, "cloth", paint(torus(0.113 * s, 0.01 * s, 22, 5, Math.PI), kit.player, { at: [0, 0.02 * s, -0.005 * s], rot: [Math.PI / 2, 0, Math.PI] }));
  // A strap from the belt up over the shoulder, holding the pack.
  o.add(rig.chest, "gear", rod([0.1 * s, 0.3 * s, -0.08 * s], [0.12 * s, 0.02 * s, 0.13 * s], 0.012 * s, C.strap, 6));
}
