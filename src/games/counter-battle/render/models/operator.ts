import { ball, box, cyl, dome, paint, rod, roundBox, shade } from "../geo";
import { FIELD_COLOURS as C } from "../palette";
import { buildBody, elbowPads, kneePads } from "./body";
import type { Kit, Outfit } from "./outfit";
import { wrap } from "./pro";
import type { Rig } from "./rig";

const SHIRT = "#50554b";
const PANTS = "#4d4c41";
const BOOT = "#6b5536";

/**
 * The Operator: a plate carrier in the team colour loaded with magazine
 * pouches and a radio, a combat shirt, a cut helmet with a headset and a
 * strobe in the player's own colour, balaclava and dark goggles.
 */
export function buildOperator(rig: Rig, o: Outfit, kit: Kit): void {
  const s = rig.size.s;
  buildBody(rig, o, {
    top: SHIRT,
    trim: shade(SHIRT, -0.2),
    sleeve: kit.dark,
    forearm: kit.dark,
    glove: "#2a2b2d",
    pants: PANTS,
    boot: BOOT,
    sole: "#2a2520",
    skin: kit.skin,
    chestWidth: 1.02,
    chestDepth: 1,
    highBoots: true,
  });
  kneePads(rig, o, C.charcoal);
  elbowPads(rig, o, C.charcoal);

  // The plate carrier: front and back plates, shoulder straps and a cummerbund.
  const c = rig.chest;
  o.add(c, "gear", paint(roundBox(0.3 * s, 0.3 * s, 0.07 * s, 0.03 * s), kit.team, { at: [0, 0.13 * s, 0.1 * s] }));
  o.add(c, "gear", paint(roundBox(0.3 * s, 0.32 * s, 0.07 * s, 0.03 * s), kit.team, { at: [0, 0.14 * s, -0.1 * s] }));
  for (const side of [-1, 1]) o.add(c, "gear", paint(roundBox(0.06 * s, 0.03 * s, 0.22 * s, 0.012 * s), kit.team, { at: [side * 0.1 * s, 0.3 * s, 0] }));
  o.add(rig.spine, "gear", paint(cyl(0.19 * s, 0.19 * s, 0.12 * s, 20), shade(kit.team, -0.25), { at: [0, 0.14 * s, 0], scale: [1.05, 1, 0.78] }));
  // Three rifle magazine pouches across the front, each with a magazine showing.
  for (let i = 0; i < 3; i++) {
    const x = (-0.09 + i * 0.09) * s;
    o.add(c, "gear", paint(roundBox(0.075 * s, 0.1 * s, 0.05 * s, 0.012 * s), C.charcoal, { at: [x, 0.03 * s, 0.155 * s] }));
    o.add(c, "gear", paint(box(0.05 * s, 0.03 * s, 0.03 * s), "#151515", { at: [x, 0.09 * s, 0.155 * s] }));
  }
  // A radio on the left side with its antenna up behind the shoulder.
  o.add(c, "gear", paint(roundBox(0.05 * s, 0.11 * s, 0.07 * s, 0.01 * s), "#2d2f2a", { at: [0.17 * s, 0.1 * s, -0.04 * s] }));
  o.add(c, "gear", rod([0.17 * s, 0.15 * s, -0.06 * s], [0.19 * s, 0.42 * s, -0.12 * s], 0.005 * s, "#111111", 5));
  // The player's colour: a patch on the left shoulder.
  o.add(rig.shoulderL, "cloth", paint(roundBox(0.02 * s, 0.07 * s, 0.07 * s, 0.01 * s), kit.player, { at: [0.068 * s, -0.08 * s, 0] }));

  // Head: balaclava, goggles, then the helmet with its rails, headset and strobe.
  const h = rig.head;
  o.add(h, "cloth", paint(ball(0.104 * s, 16, 12), "#24262a", { scale: [0.95, 1.08, 1] }));
  o.add(h, "lens", paint(wrap(0.108 * s, 0.042 * s, 2.2), "#0d1216", { at: [0, 0.014 * s, 0.002 * s] }));
  o.add(h, "gear", paint(cyl(0.109 * s, 0.109 * s, 0.012 * s, 22), "#111111", { at: [0, 0.014 * s, 0] }));
  o.add(h, "gear", paint(dome(0.122 * s, 0.56), kit.dark, { at: [0, 0.02 * s, -0.012 * s], rot: [-0.3, 0, 0], scale: [1, 1.05, 1.08] }));
  for (const side of [-1, 1]) {
    o.add(h, "gear", paint(box(0.012 * s, 0.03 * s, 0.13 * s), "#1d1e20", { at: [side * 0.12 * s, 0.035 * s, -0.005 * s] }));
    o.add(h, "gear", paint(cyl(0.048 * s, 0.048 * s, 0.045 * s, 16), "#26282b", { at: [side * 0.11 * s, -0.005 * s, 0], rot: [0, 0, Math.PI / 2] }));
  }
  o.add(h, "gear", rod([-0.12 * s, -0.02 * s, 0.02 * s], [-0.05 * s, -0.075 * s, 0.1 * s], 0.005 * s, "#111111", 5));
  o.add(h, "gear", paint(roundBox(0.05 * s, 0.035 * s, 0.03 * s, 0.008 * s), "#1d1e20", { at: [0, 0.1 * s, 0.1 * s], rot: [-0.5, 0, 0] }));
  o.add(h, "lens", paint(roundBox(0.03 * s, 0.02 * s, 0.02 * s, 0.006 * s), kit.player, { at: [0, 0.145 * s, -0.07 * s] }));
}
