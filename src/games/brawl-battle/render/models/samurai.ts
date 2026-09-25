import { humanBody, tinted } from "./body";
import { ball, box, cone, cyl, paint } from "./geo";
import { PartList, type Dims, type RigSpec } from "./rig";

export const SAMURAI_DIMS: Dims = { hipY: 0.88, thigh: 0.41, shin: 0.39, torso: 0.52, upper: 0.3, fore: 0.28, shoulderX: 0.24, hipX: 0.11, head: 0.17, headR: 0.15 };

/** How far the katana reaches past the fist, for the swing trails. */
export const KATANA = { grip: 0.08, tip: 1.28 };

/**
 * Samurai: red lacquered armour with broad shoulder plates and a plated
 * skirt, a dark horned helmet with a gold crest, and a long katana held
 * forward. A duplicate's armour takes the player's colour.
 */
export function buildSamurai(tint: string | null): RigSpec {
  const d = SAMURAI_DIMS;
  const p = new PartList();
  const armour = tint ?? "#dc2626";
  const dark = "#1f2937";
  const gold = "#fbbf24";
  const cloth = tinted("#312e81", tint, 0.25);
  humanBody(p, d, { skin: "#e0ac7e", chest: armour, sleeve: dark, pants: cloth, feet: "#111827" }, { chest: 0.25, waist: 0.18, arm: 0.06, leg: 0.08, longSleeves: true, flare: 1.35 });
  p.add(
    "torso",
    paint(box(0.44, 0.06, 0.34), gold, { at: [0, d.torso * 0.35, 0] }),
    paint(box(0.46, 0.05, 0.36), dark, { at: [0, d.torso * 0.62, 0] }),
  );
  // The plated skirt: front, back and side panels hanging off the belt.
  for (const [x, z, ry] of [[0, 0.16, 0], [0, -0.16, 0], [0.19, 0, Math.PI / 2], [-0.19, 0, Math.PI / 2]] as const) {
    p.add("hips", paint(box(0.24, 0.3, 0.04), armour, { at: [x, -0.12, z], rot: [z > 0 ? -0.18 : z < 0 ? 0.18 : 0, ry, x > 0 ? 0.18 : x < 0 ? -0.18 : 0] }));
  }
  p.add("hips", paint(box(0.42, 0.06, 0.36), gold, { at: [0, 0.04, 0] }));
  for (const side of [1, -1] as const) {
    const bone = side > 0 ? "shoulderL" : "shoulderR";
    p.add(bone, paint(box(0.2, 0.26, 0.3), armour, { at: [side * 0.07, -0.08, 0], rot: [0, 0, side * 0.3] }), paint(box(0.2, 0.04, 0.31), gold, { at: [side * 0.1, -0.2, 0], rot: [0, 0, side * 0.3] }));
  }
  const h = d.head;
  const r = d.headR;
  p.add(
    "neck",
    // The helmet bowl, its flared neck guard and the gold horned crest.
    paint(ball(r * 1.12, 8, 5), dark, { at: [0, h + r * 0.25, -0.01], scale: [1, 0.8, 1] }),
    paint(cyl(r * 1.25, r * 1.75, 0.14, 8), dark, { at: [0, h + r * 0.05, -0.04] }),
    paint(box(0.06, 0.34, 0.03), gold, { at: [0.1, h + r * 1.2, r * 0.8], rot: [0.2, 0, -0.5] }),
    paint(box(0.06, 0.34, 0.03), gold, { at: [-0.1, h + r * 1.2, r * 0.8], rot: [0.2, 0, 0.5] }),
    paint(ball(0.05, 6, 4), gold, { at: [0, h + r * 0.75, r * 1.05] }),
    // A half mask over the jaw.
    paint(box(r * 1.5, r * 0.6, 0.06), "#991b1b", { at: [0, h - r * 0.55, r * 0.8] }),
  );
  // The katana, held in the fist and pointing along the hand's forward axis.
  const g = KATANA.grip;
  p.add(
    "handR",
    paint(cyl(0.028, 0.028, 0.3, 5), "#111827", { at: [0, -0.04, g - 0.1], rot: [Math.PI / 2, 0, 0] }),
    paint(cyl(0.085, 0.085, 0.025, 8), gold, { at: [0, -0.04, g + 0.06], rot: [Math.PI / 2, 0, 0] }),
    paint(box(0.018, 0.07, KATANA.tip - 0.1), "#e2e8f0", { at: [0, -0.04, g + 0.08 + (KATANA.tip - 0.1) / 2] }),
    paint(cone(0.035, 0.12, 3), "#e2e8f0", { at: [0, -0.04, KATANA.tip + 0.1], rot: [Math.PI / 2, 0, 0], scale: [0.5, 1, 1] }),
  );
  // The scabbard on the left hip.
  p.add("hips", paint(cyl(0.03, 0.03, 0.9, 5), "#0f172a", { at: [0.22, -0.02, -0.12], rot: [1.25, 0, 0.1] }));
  return { dims: d, solid: p.solid };
}
