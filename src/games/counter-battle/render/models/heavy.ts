import { ball, box, cyl, dome, paint, rod, roundBox, shade } from "../geo";
import { FIELD_COLOURS as C } from "../palette";
import { buildBody, kneePads } from "./body";
import type { Kit, Outfit } from "./outfit";
import { wrap } from "./pro";
import type { Rig } from "./rig";

const UNDER = "#2f3238";
const BLACK = "#1b1d21";
const BRASS = "#d4a646";

/**
 * The Heavy Gunner: a big frame in layered armour, plates and shoulder
 * guards in the team colour, a bandolier of rounds across the chest, and
 * a full helmet with a tinted visor and a respirator. The stripe on the
 * helmet and the arm band are the player's own colour.
 */
export function buildHeavy(rig: Rig, o: Outfit, kit: Kit): void {
  const s = rig.size.s;
  buildBody(rig, o, {
    top: UNDER,
    trim: BLACK,
    sleeve: kit.dark,
    forearm: kit.dark,
    glove: BLACK,
    pants: kit.dark,
    boot: BLACK,
    sole: "#0f1012",
    skin: kit.skin,
    chestWidth: 1.12,
    chestDepth: 1.2,
    highBoots: true,
  });
  kneePads(rig, o, kit.team);

  // Armour: chest and back plates, a collar, the belly guard and a plate over each thigh.
  const c = rig.chest;
  o.add(c, "gear", paint(roundBox(0.36 * s, 0.32 * s, 0.09 * s, 0.04 * s), kit.team, { at: [0, 0.13 * s, 0.11 * s], rot: [-0.06, 0, 0] }));
  o.add(c, "gear", paint(roundBox(0.36 * s, 0.34 * s, 0.09 * s, 0.04 * s), shade(kit.team, -0.2), { at: [0, 0.14 * s, -0.12 * s] }));
  o.add(c, "gear", paint(roundBox(0.24 * s, 0.05 * s, 0.03 * s, 0.012 * s), BLACK, { at: [0, 0.21 * s, 0.16 * s] }));
  o.add(c, "gear", paint(cyl(0.1 * s, 0.13 * s, 0.07 * s, 18), BLACK, { at: [0, 0.3 * s, 0], scale: [1.25, 1, 1] }));
  o.add(rig.spine, "gear", paint(roundBox(0.3 * s, 0.14 * s, 0.07 * s, 0.03 * s), shade(kit.team, -0.1), { at: [0, 0.05 * s, 0.12 * s] }));
  for (const hip of [rig.hipL, rig.hipR]) o.add(hip, "gear", paint(roundBox(0.14 * s, 0.2 * s, 0.05 * s, 0.025 * s), kit.team, { at: [0, -0.14 * s, 0.085 * s], rot: [0.08, 0, 0] }));
  // Shoulder guards: a big rounded shell on each shoulder.
  for (const sh of [rig.shoulderL, rig.shoulderR]) {
    o.add(sh, "gear", paint(dome(0.1 * s, 0.5, 16, 8), kit.team, { at: [0, -0.01 * s, 0], scale: [1.1, 0.9, 1.15] }));
    o.add(sh, "gear", paint(cyl(0.1 * s, 0.1 * s, 0.02 * s, 16), BLACK, { at: [0, -0.015 * s, 0], scale: [1.1, 1, 1.15] }));
  }
  o.add(rig.shoulderL, "cloth", paint(cyl(0.07 * s, 0.07 * s, 0.05 * s, 14), kit.player, { at: [0, -0.16 * s, 0] }));

  // The bandolier: a strap from the right shoulder to the left hip, studded with rounds.
  const from = [-0.16 * s, 0.29 * s, 0.14 * s] as const;
  const to = [0.17 * s, -0.02 * s, 0.17 * s] as const;
  o.add(c, "gear", rod(from, to, 0.02 * s, "#3b2f22", 6));
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const at = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t + 0.015 * s] as const;
    o.add(c, "gear", paint(cyl(0.009 * s, 0.009 * s, 0.05 * s, 6), BRASS, { at: [at[0], at[1], at[2]], rot: [0, 0, 0.8] }));
  }

  // The helmet: a full shell, the team stripe down the middle, a big visor and a respirator.
  const h = rig.head;
  o.add(h, "cloth", paint(ball(0.105 * s, 16, 12), UNDER, { scale: [0.95, 1.08, 1] }));
  o.add(h, "gear", paint(dome(0.128 * s, 0.62), BLACK, { at: [0, 0.0, -0.01 * s], scale: [1, 1.04, 1.1] }));
  o.add(h, "gear", paint(box(0.03 * s, 0.02 * s, 0.25 * s), kit.player, { at: [0, 0.14 * s, -0.01 * s], rot: [0.1, 0, 0] }));
  o.add(h, "lens", paint(wrap(0.128 * s, 0.07 * s, 2.3), shade(kit.team, -0.55), { at: [0, 0.01 * s, 0.004 * s] }));
  o.add(h, "gear", paint(roundBox(0.1 * s, 0.07 * s, 0.07 * s, 0.03 * s), "#2a2d33", { at: [0, -0.07 * s, 0.08 * s] }));
  for (const side of [-1, 1]) {
    o.add(h, "gear", paint(cyl(0.028 * s, 0.028 * s, 0.05 * s, 12), BLACK, { at: [side * 0.065 * s, -0.08 * s, 0.1 * s], rot: [0, 0, side * 1.2] }));
    o.add(h, "gear", paint(cyl(0.03 * s, 0.03 * s, 0.006 * s, 12), kit.team, { at: [side * 0.09 * s, -0.09 * s, 0.105 * s], rot: [0, 0, side * 1.2] }));
  }
  o.add(h, "gear", paint(box(0.02 * s, 0.03 * s, 0.03 * s), C.charcoal, { at: [0, -0.02 * s, 0.13 * s] }));
}
