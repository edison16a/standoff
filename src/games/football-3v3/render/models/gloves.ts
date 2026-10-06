import * as THREE from "three";
import { shade } from "./geo";
import type { KitSpec } from "./kit";
import { dress, merge, rigid, weigh } from "./parts";
import type { Dims } from "./rig";

/**
 * A receiver's glove round the hand bone: a padded back, a tacky palm,
 * four fingers curled a little toward it and a thumb out front, with a
 * strap at the wrist. At rest the hand hangs with its palm to the thigh,
 * so the palm faces the body's middle.
 */
export function glove(d: Dims, kit: KitSpec, side: 1 | -1, detail: number): THREE.BufferGeometry {
  const k = d.height / 1.85;
  const back = kit.look.accent;
  const palm = shade(back, back === "#111111" ? 0.12 : -0.25);
  const seg = Math.max(5, Math.round(8 * detail));
  // The palm faces -x on the left hand and +x on the right.
  const inward = -side;
  const parts: THREE.BufferGeometry[] = [
    // The hand's body: a flattened round slab from the wrist to the knuckles.
    dress(new THREE.SphereGeometry(0.052 * k, seg + 4, seg), { colour: back, rough: 0.55 }, { at: [0, 0.0, 0], scale: [0.42, 1.0, 0.92] }),
    dress(new THREE.SphereGeometry(0.048 * k, seg + 4, seg), { colour: palm, rough: 0.85 }, { at: [inward * 0.007 * k, -0.002 * k, 0], scale: [0.34, 0.95, 0.88] }),
    // The strap round the wrist.
    dress(new THREE.CylinderGeometry(0.032 * k, 0.034 * k, 0.026 * k, seg + 4), { colour: shade(back, -0.2), rough: 0.6 }, { at: [0, 0.05 * k, 0], scale: [0.85, 1, 1.12] }),
  ];
  // Four fingers in two joints each, curling toward the palm, the middle one longest.
  const lengths = [0.058, 0.066, 0.062, 0.05];
  lengths.forEach((len, i) => {
    const z = (0.026 - i * 0.0172) * k;
    const near = len * 0.55 * k;
    const far = len * 0.45 * k;
    const r = 0.0098 * k;
    const bend = 0.5;
    // The first joint leans toward the palm, the second curls further.
    const x1 = inward * Math.sin(bend * 0.5) * near * 0.5;
    const y1 = -0.042 * k - Math.cos(bend * 0.5) * near * 0.5;
    parts.push(dress(new THREE.CapsuleGeometry(r, near, 2, seg), { colour: back, rough: 0.6 }, { at: [x1, y1, z], rot: [0, 0, inward * -bend * 0.5] }));
    const x2 = inward * (Math.sin(bend * 0.5) * near + Math.sin(bend * 1.4) * far * 0.5);
    const y2 = -0.042 * k - Math.cos(bend * 0.5) * near - Math.cos(bend * 1.4) * far * 0.5;
    parts.push(dress(new THREE.CapsuleGeometry(r * 0.92, far, 2, seg), { colour: palm, rough: 0.7 }, { at: [x2, y2, z], rot: [0, 0, inward * -bend * 1.4] }));
  });
  // The thumb comes off the front of the palm and lies along the fingers.
  parts.push(dress(new THREE.CapsuleGeometry(0.0095 * k, 0.05 * k, 2, seg), { colour: back, rough: 0.6 }, { at: [inward * 0.016 * k, -0.025 * k, 0.04 * k], rot: [0.45, 0, inward * -0.3] }));
  // Built round the hand bone; skinned parts live where the bone rests in the model.
  const hand = merge(parts).translate(side * d.shoulderX, d.shoulderY - d.upper - d.fore - d.palm, 0);
  return weigh(hand, rigid(side > 0 ? "handL" : "handR"));
}
