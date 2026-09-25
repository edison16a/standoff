import { humanBody, tinted } from "./body";
import { box, cone, cyl, ico, paint } from "./geo";
import { PartList, type Dims, type RigSpec } from "./rig";

export const MAGE_DIMS: Dims = { hipY: 0.84, thigh: 0.39, shin: 0.37, torso: 0.48, upper: 0.28, fore: 0.27, shoulderX: 0.2, hipX: 0.09, head: 0.19, headR: 0.165 };

/** Where the staff's gem sits in the hand's space, for the spell trails. */
export const STAFF_GEM = { y: 1.02 };

/**
 * Mage: a flowing violet robe, a tall crooked hat with a wide brim, a
 * long white beard and a staff topped with a glowing gem. A duplicate's
 * robe and hat take the player's colour.
 */
export function buildMage(tint: string | null): RigSpec {
  const d = MAGE_DIMS;
  const p = new PartList();
  const robe = tint ? tinted(tint, "#1e1b4b", 0.2) : "#7c3aed";
  const trim = "#fcd34d";
  const inner = "#312e81";
  humanBody(p, d, { skin: "#f2c9a0", chest: robe, sleeve: robe, pants: inner, feet: "#3b0764", brows: "#f8fafc" }, { chest: 0.21, waist: 0.19, arm: 0.06, leg: 0.065, longSleeves: true });
  // The robe's skirt hangs from the hips over the legs, split at the front for walking.
  p.add(
    "hips",
    paint(cyl(0.2, 0.36, 0.64, 8), robe, { at: [0, -0.32, -0.03], scale: [1, 1, 0.85] }),
    paint(cyl(0.365, 0.37, 0.05, 8), trim, { at: [0, -0.63, -0.03], scale: [1, 1, 0.85] }),
    paint(box(0.4, 0.06, 0.32), trim, { at: [0, 0.05, 0] }),
  );
  p.add("torso", paint(box(0.06, d.torso * 0.8, 0.03), trim, { at: [0, d.torso * 0.5, 0.15] }));
  for (const side of ["L", "R"] as const) {
    // Wide bell sleeves at the wrist.
    p.add(`elbow${side}`, paint(cyl(0.07, 0.12, 0.14, 7), robe, { at: [0, -d.fore + 0.07, 0] }), paint(cyl(0.12, 0.12, 0.03, 7), trim, { at: [0, -d.fore, 0] }));
  }
  const h = d.head;
  const r = d.headR;
  p.add(
    "neck",
    // A long pointed beard under a curling moustache.
    paint(cone(0.16, 0.44, 6), "#f8fafc", { at: [0, h - r * 1.25, r * 0.55], rot: [Math.PI + 0.3, 0, 0] }),
    paint(box(0.11, 0.045, 0.04), "#f8fafc", { at: [0.055, h - r * 0.3, r * 0.94], rot: [0, 0, -0.35] }),
    paint(box(0.11, 0.045, 0.04), "#f8fafc", { at: [-0.055, h - r * 0.3, r * 0.94], rot: [0, 0, 0.35] }),
    // The hat: a wide brim, a band and a tall cone that bends back at the tip.
    paint(cyl(0.34, 0.34, 0.03, 9), robe, { at: [0, h + r * 0.55, 0] }),
    paint(cyl(0.17, 0.2, 0.08, 8), trim, { at: [0, h + r * 0.75, 0] }),
    paint(cyl(0.09, 0.19, 0.34, 8), robe, { at: [0, h + r * 0.75 + 0.2, -0.02], rot: [-0.12, 0, 0] }),
    paint(cone(0.09, 0.3, 7), robe, { at: [0, h + r * 0.75 + 0.48, -0.12], rot: [-0.55, 0, 0] }),
  );
  // The staff runs up through the fist, its gem well above the head.
  p.add(
    "handR",
    paint(cyl(0.03, 0.035, 1.8, 5), "#78350f", { at: [0, 0.12, 0.02] }),
    paint(cyl(0.06, 0.03, 0.12, 5), trim, { at: [0, STAFF_GEM.y - 0.12, 0.02] }),
  );
  p.lit("handR", paint(ico(0.12), "#67e8f9", { at: [0, STAFF_GEM.y, 0.02] }));
  // Stars on the hat, and gold claws holding the gem.
  for (const [x, y, z] of [[0.05, 0.2, 0.18], [-0.08, 0.34, 0.1], [0.02, 0.05, 0.3]] as const) p.lit("neck", paint(ico(0.035), "#fde047", { at: [x, h + r * 0.75 + y, z] }));
  for (const a of [0, 2.1, 4.2]) p.add("handR", paint(cone(0.025, 0.14, 4), trim, { at: [Math.cos(a) * 0.07, STAFF_GEM.y - 0.04, 0.02 + Math.sin(a) * 0.07], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }));
  return { dims: d, solid: p.solid, glow: p.glow };
}
