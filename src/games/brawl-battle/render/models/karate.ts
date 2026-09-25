import { humanBody, tinted } from "./body";
import { box, cone, cyl, paint } from "./geo";
import { PartList, type Dims, type RigSpec } from "./rig";

export const KARATE_DIMS: Dims = { hipY: 0.86, thigh: 0.4, shin: 0.38, torso: 0.5, upper: 0.29, fore: 0.27, shoulderX: 0.22, hipX: 0.1, head: 0.2, headR: 0.18 };

/**
 * Karate: a lean fighter in a white gi, bare feet and forearms, spiky
 * black hair and a red headband whose tails stream behind. A duplicate
 * wears the player's colour on the belt and the band.
 */
export function buildKarate(tint: string | null): RigSpec {
  const d = KARATE_DIMS;
  const p = new PartList();
  const gi = tinted("#f8fafc", tint, 0.18);
  const band = tint ?? "#e11d48";
  const belt = tint ?? "#111827";
  const skin = "#e9b384";
  humanBody(p, d, { skin, chest: gi, sleeve: gi, pants: gi, feet: skin }, { chest: 0.22, waist: 0.16, arm: 0.055, leg: 0.075, flare: 1.15 });
  p.add(
    "torso",
    // The gi's crossed lapels, a darker V down the chest.
    paint(box(0.05, 0.3, 0.02), "#cbd5e1", { at: [0.05, d.torso * 0.66, 0.16], rot: [0, 0, 0.45] }),
    paint(box(0.05, 0.3, 0.02), "#cbd5e1", { at: [-0.05, d.torso * 0.66, 0.16], rot: [0, 0, -0.45] }),
    // Bare chest in the V of the lapels.
    paint(cone(0.07, 0.2, 3), skin, { at: [0, d.torso * 0.76, 0.15], rot: [Math.PI, 0, 0], scale: [1, 1, 0.3] }),
  );
  // Short gi sleeves end in a wide cuff below the elbow.
  for (const side of ["L", "R"] as const) p.add(`elbow${side}`, paint(cyl(0.075, 0.085, 0.09, 7), gi, { at: [0, -0.03, 0] }));
  p.add(
    "hips",
    paint(box(0.36, 0.07, 0.28), belt, { at: [0, 0.07, 0] }),
    paint(box(0.05, 0.2, 0.03), belt, { at: [0.07, -0.02, 0.15], rot: [0, 0, 0.2] }),
    paint(box(0.05, 0.2, 0.03), belt, { at: [-0.02, -0.03, 0.15], rot: [0, 0, -0.15] }),
  );
  const h = d.head;
  const r = d.headR;
  const spikes: [number, number, number, number][] = [
    [0, r * 0.95, -0.02, 0], [0.07, r * 0.85, -0.05, -0.5], [-0.07, r * 0.85, -0.05, 0.5], [0, r * 0.7, -0.11, 0], [0.04, r * 0.75, 0.05, -0.3], [-0.04, r * 0.75, 0.05, 0.3],
  ];
  for (const [x, y, z, tilt] of spikes) p.add("neck", paint(cone(r * 0.5, r * 1.2, 4), "#111827", { at: [x * 1.2, h + y, z * 1.2], rot: [-0.5, 0, tilt] }));
  p.add(
    "neck",
    paint(box(r * 2.1, 0.05, r * 2.1), band, { at: [0, h + r * 0.4, 0] }),
    // The headband's two tails, flying back off the knot.
    paint(box(0.05, 0.04, 0.42), band, { at: [0.04, h + r * 0.3, -r - 0.18], rot: [0.3, 0.25, 0] }),
    paint(box(0.05, 0.04, 0.36), band, { at: [-0.04, h + r * 0.15, -r - 0.15], rot: [0.6, -0.2, 0] }),
    paint(box(0.1, 0.08, 0.06), band, { at: [0, h + r * 0.4, -r * 1.02] }),
  );
  return { dims: d, solid: p.solid };
}
