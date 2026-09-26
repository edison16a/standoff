import { ball, box, cone, dome, paint, rod, roundBox, shade, torus } from "../geo";
import { FIELD_COLOURS as C } from "../palette";
import { buildBody, kneePads } from "./body";
import type { Kit, Outfit } from "./outfit";
import type { Rig } from "./rig";

const JOGGERS = "#2a2d33";
const HAIR = "#1d1410";

/**
 * The Street Runner: a hoodie in the team colour with the hood down, a
 * bandana over the face and a cap on backwards in the player's own colour,
 * joggers with a team stripe, bright trainers and a sling bag.
 */
export function buildRunner(rig: Rig, o: Outfit, kit: Kit): void {
  const s = rig.size.s;
  buildBody(rig, o, {
    top: kit.team,
    trim: kit.dark,
    sleeve: kit.team,
    forearm: kit.team,
    glove: "#2a2d33",
    pants: JOGGERS,
    boot: C.white,
    sole: kit.player,
    skin: kit.skin,
    chestWidth: 0.98,
    chestDepth: 0.98,
    loose: true,
  });
  kneePads(rig, o, "#3a3e46");

  // The hood rolled down behind the neck, the pocket and the drawstrings.
  const c = rig.chest;
  o.add(c, "cloth", paint(torus(0.085 * s, 0.035 * s, 18, 8), kit.team, { at: [0, 0.3 * s, -0.035 * s], rot: [Math.PI / 2 + 0.35, 0, 0], scale: [1.2, 1, 1] }));
  o.add(c, "cloth", paint(ball(0.08 * s, 12, 8), shade(kit.team, -0.15), { at: [0, 0.23 * s, -0.12 * s], scale: [1.4, 1, 0.55] }));
  o.add(rig.spine, "cloth", paint(roundBox(0.2 * s, 0.1 * s, 0.03 * s, 0.02 * s), kit.dark, { at: [0, 0.03 * s, 0.11 * s] }));
  for (const side of [-1, 1]) o.add(c, "cloth", rod([side * 0.035 * s, 0.29 * s, 0.1 * s], [side * 0.04 * s, 0.14 * s, 0.135 * s], 0.005 * s, "#f4f6f1", 4));
  // Cuffs at the wrists, stripes down the joggers.
  for (const el of [rig.elbowL, rig.elbowR]) o.add(el, "cloth", paint(torus(0.045 * s, 0.012 * s, 14, 5), kit.dark, { at: [0, -0.24 * s, 0], rot: [Math.PI / 2, 0, 0] }));
  for (const [hip, side] of [[rig.hipL, 1], [rig.hipR, -1]] as const) {
    o.add(hip, "cloth", paint(box(0.012 * s, 0.36 * s, 0.03 * s), kit.team, { at: [side * 0.088 * s, -0.22 * s, 0] }));
  }

  // A sling bag across the back, its strap over the left shoulder.
  o.add(c, "gear", paint(roundBox(0.2 * s, 0.13 * s, 0.07 * s, 0.03 * s), "#1d2026", { at: [0.02 * s, 0.13 * s, -0.15 * s], rot: [0, 0, -0.5] }));
  o.add(c, "gear", paint(box(0.08 * s, 0.03 * s, 0.01 * s), kit.player, { at: [0.02 * s, 0.13 * s, -0.19 * s], rot: [0, 0, -0.5] }));
  o.add(c, "gear", rod([0.12 * s, 0.3 * s, 0], [-0.16 * s, -0.02 * s, 0.13 * s], 0.012 * s, "#1d2026", 5));

  // The head: face, ears, eyes and brows over the bandana, short hair under a backwards cap.
  const h = rig.head;
  o.add(h, "skin", paint(ball(0.1 * s, 18, 14), kit.skin, { scale: [0.92, 1.1, 1] }));
  for (const side of [-1, 1]) {
    o.add(h, "skin", paint(ball(0.024 * s, 8, 6), kit.skin, { at: [side * 0.093 * s, 0, -0.005 * s], scale: [0.5, 1, 0.8] }));
    o.add(h, "gear", paint(ball(0.012 * s, 8, 6), "#161616", { at: [side * 0.036 * s, 0.02 * s, 0.088 * s] }));
    o.add(h, "skin", paint(box(0.035 * s, 0.008 * s, 0.01 * s), HAIR, { at: [side * 0.037 * s, 0.043 * s, 0.09 * s], rot: [0, 0, side * -0.15] }));
  }
  o.add(h, "cloth", paint(dome(0.103 * s, 0.5), HAIR, { at: [0, 0.012 * s, -0.004 * s], scale: [0.95, 1.08, 1.02] }));
  // The bandana: a band round the lower face and a point hanging down the front.
  o.add(h, "cloth", paint(ball(0.104 * s, 18, 10), kit.player, { at: [0, -0.035 * s, 0.004 * s], scale: [0.95, 0.55, 1.02] }));
  o.add(h, "cloth", paint(cone(0.06 * s, 0.09 * s, 3), kit.player, { at: [0, -0.1 * s, 0.07 * s], rot: [Math.PI + 0.25, 0, 0], scale: [1.3, 1, 0.35] }));
  // The cap, on backwards with the peak over the neck.
  o.add(h, "cloth", paint(dome(0.108 * s, 0.45), kit.dark, { at: [0, 0.035 * s, -0.005 * s], scale: [0.96, 0.95, 1.02] }));
  o.add(h, "cloth", paint(roundBox(0.12 * s, 0.012 * s, 0.09 * s, 0.006 * s), kit.player, { at: [0, 0.04 * s, -0.13 * s], rot: [-0.12, 0, 0] }));
  o.add(h, "cloth", paint(ball(0.012 * s, 6, 4), kit.player, { at: [0, 0.14 * s, 0] }));
}
