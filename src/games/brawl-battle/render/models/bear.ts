import { tinted } from "./body";
import { ball, box, cone, cyl, ico, knob, limb, paint } from "./geo";
import { PartList, type Dims, type RigSpec } from "./rig";

export const BEAR_DIMS: Dims = { hipY: 0.7, thigh: 0.32, shin: 0.3, torso: 0.78, upper: 0.36, fore: 0.34, shoulderX: 0.42, hipX: 0.22, head: 0.28, headR: 0.3 };

/**
 * Bear: a huge round brown bear with a cream belly and muzzle, round
 * ears, thick arms ending in clawed paws and short stout legs. He wears
 * a wrestler's belt, in the player's colour when he is a duplicate.
 */
export function buildBear(tint: string | null): RigSpec {
  const d = BEAR_DIMS;
  const p = new PartList();
  const fur = tinted("#9a4a12", tint, 0.15);
  const darkFur = "#6b2f0b";
  const cream = "#fcd9a8";
  const belt = tint ?? "#2563eb";
  p.add(
    "hips",
    paint(ico(0.42, 1), fur, { at: [0, 0.02, 0], scale: [1, 0.7, 0.85] }),
    paint(cyl(0.44, 0.46, 0.16, 9), belt, { at: [0, 0.14, 0], scale: [1, 1, 0.85] }),
    paint(box(0.2, 0.14, 0.05), "#fbbf24", { at: [0, 0.14, 0.38] }),
  );
  p.add(
    "torso",
    paint(ico(0.5, 1), fur, { at: [0, d.torso * 0.5, 0], scale: [1, 1.05, 0.85] }),
    paint(ico(0.36, 1), cream, { at: [0, d.torso * 0.42, 0.17], scale: [0.9, 1.1, 0.7] }),
  );
  const h = d.head;
  const r = d.headR;
  p.add(
    "neck",
    paint(ico(r, 1), fur, { at: [0, h, 0], scale: [1, 0.92, 0.95] }),
    paint(ball(r * 0.36, 6, 5), fur, { at: [r * 0.75, h + r * 0.75, -0.02] }),
    paint(ball(r * 0.36, 6, 5), fur, { at: [-r * 0.75, h + r * 0.75, -0.02] }),
    paint(ball(r * 0.2, 6, 4), cream, { at: [r * 0.75, h + r * 0.75, 0.06] }),
    paint(ball(r * 0.2, 6, 4), cream, { at: [-r * 0.75, h + r * 0.75, 0.06] }),
    paint(ball(r * 0.48, 7, 5), cream, { at: [0, h - r * 0.28, r * 0.72], scale: [1, 0.75, 0.85] }),
    paint(ball(r * 0.17, 6, 4), "#111827", { at: [0, h - r * 0.12, r * 1.1], scale: [1.3, 0.9, 1] }),
    paint(box(0.06, 0.07, 0.03), "#111827", { at: [r * 0.38, h + r * 0.28, r * 0.84] }),
    paint(box(0.06, 0.07, 0.03), "#111827", { at: [-r * 0.38, h + r * 0.28, r * 0.84] }),
    // Heavy brows make him look grumpy and ready.
    paint(box(0.13, 0.04, 0.03), darkFur, { at: [r * 0.36, h + r * 0.45, r * 0.84], rot: [0, 0, -0.35] }),
    paint(box(0.13, 0.04, 0.03), darkFur, { at: [-r * 0.36, h + r * 0.45, r * 0.84], rot: [0, 0, 0.35] }),
  );
  for (const side of ["L", "R"] as const) {
    p.add(`shoulder${side}`, paint(knob(0.17), fur), paint(limb(0.16, 0.14, d.upper), fur));
    p.add(`elbow${side}`, paint(knob(0.14), fur), paint(limb(0.14, 0.15, d.fore), fur));
    const paw = [paint(ball(0.16, 7, 5), darkFur, { at: [0, -0.07, 0.02], scale: [1, 0.85, 1] })];
    for (const x of [-0.08, 0, 0.08]) paw.push(paint(cone(0.03, 0.11, 4), "#f8fafc", { at: [x, -0.18, 0.1], rot: [2.4, 0, 0] }));
    p.add(`hand${side}`, ...paw);
    p.add(`hip${side}`, paint(knob(0.16), fur), paint(limb(0.17, 0.15, d.thigh), fur));
    p.add(`knee${side}`, paint(knob(0.14), fur), paint(limb(0.15, 0.13, d.shin), fur));
    p.add(`ankle${side}`, paint(box(0.26, 0.1, 0.34), darkFur, { at: [0, -0.04, 0.07] }), paint(box(0.18, 0.02, 0.2), cream, { at: [0, -0.09, 0.07] }));
  }
  return { dims: d, solid: p.solid };
}
