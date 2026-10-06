import * as THREE from "three";
import { shade } from "./geo";
import type { KitSpec } from "./kit";
import { angles, tube, type Station } from "./loft";
import { dress, merge, rigid, weigh } from "./parts";
import type { Dims } from "./rig";

/**
 * A football cleat on the ankle bone: a sculpted upper from the heel
 * counter to a low toe box, laces over the instep, a contrasting stripe
 * along the side, a stiff sole plate and studs underneath. Skill players
 * wrap white spat tape over the ankle and the top of the shoe.
 */

/** Heel to toe: half width, depth below and above the centre line, and the centre's height under the ankle, in metres for a 1.85 m player. */
const UPPER = [
  [0, 0.031, 0.0255, 0.0255, -0.0405],
  [0.035, 0.041, 0.039, 0.039, -0.029],
  [0.1, 0.045, 0.0295, 0.0295, -0.0395],
  [0.17, 0.049, 0.016, 0.016, -0.055],
  [0.235, 0.044, 0.0115, 0.0115, -0.0585],
  [0.272, 0.028, 0.0075, 0.0075, -0.0615],
] as const;

export function cleat(d: Dims, kit: KitSpec, side: 1 | -1, detail: number): THREE.BufferGeometry {
  const k = d.height / 1.85;
  const colour = kit.look.cleats;
  const dark = colour === "#111111";
  const trim = dark ? "#e8e8e8" : shade(colour, -0.75);
  const heel = d.heel;
  // Lofted along +y from the heel, then turned so +y runs to the toe: a section's front becomes down.
  const keys: Station[] = UPPER.map(([t, w, down, up, cy]) => ({ t: t * k, l: w * k, r: w * k, f: down * k, b: up * k, z: -cy * k }));
  const outer = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const upper = tube(new THREE.Vector3(), 1, keys, {
    ring: angles(Math.round(18 * detail)),
    step: 0.02 / detail,
    capStart: 0.012 * k,
    capEnd: 0.018 * k,
    paint: (t, a) => {
      // The side stripe sweeps from the heel up toward the laces.
      const along = t / (0.27 * k);
      const s = Math.sin(a);
      const onSide = Math.sign(s) === Math.sign(Math.sin(outer)) && Math.abs(s) > 0.75;
      const height = -Math.cos(a);
      const stripe = onSide && along > 0.2 && along < 0.75 && Math.abs(height - (0.5 - along * 0.9)) < 0.18;
      return { colour: stripe ? trim : colour, rough: 0.38 };
    },
  });
  upper.rotateX(Math.PI / 2);
  upper.translate(0, 0, heel);
  // The stud tips touch the turf, so the ground is the ankle's height below the bone.
  const ground = -d.ankleY;
  const parts = [upper];
  // The sole plate, a little wider than the upper, and the studs under it.
  const plate = dark ? "#2a2a2a" : "#f4f4f2";
  parts.push(dress(new THREE.CapsuleGeometry(0.03 * k, 0.19 * k, 3, Math.round(12 * detail)), { colour: plate, rough: 0.5 }, { at: [0, ground + 0.0115 * k, heel + 0.135 * k], rot: [Math.PI / 2, 0, 0], scale: [1.55, 1, 0.22] }));
  const studs: [number, number][] = [[0.02, 0.02], [-0.02, 0.02], [0, 0.07], [0.028, 0.15], [-0.028, 0.15], [0.026, 0.215], [-0.026, 0.215]];
  for (const [x, z] of studs) {
    parts.push(dress(new THREE.CylinderGeometry(0.0055 * k, 0.0075 * k, 0.009 * k, 6), { colour: "#9a9a9a", rough: 0.35 }, { at: [x * k, ground + 0.0045 * k, heel + z * k] }));
  }
  // Laces down the slope of the instep.
  for (let i = 0; i < 5; i++) {
    const z = heel + (0.075 + i * 0.022) * k;
    const y = (-0.001 - i * 0.0085) * k;
    parts.push(dress(new THREE.BoxGeometry(0.04 * k, 0.004 * k, 0.006 * k), { colour: dark ? "#f2f2f2" : "#202020", rough: 0.8 }, { at: [0, y, z], rot: [0.36, 0, 0] }));
  }
  if (kit.spats) {
    // White tape spatted round the ankle and over the top of the shoe.
    parts.push(dress(new THREE.CylinderGeometry(0.047 * k, 0.05 * k, 0.07 * k, Math.round(18 * detail), 1, true), { colour: "#f6f6f4", rough: 0.85 }, { at: [0, -0.008 * k, 0.004 * k], scale: [1, 1, 1.18] }));
  }
  // Built round the ankle; skinned parts live where the bone rests in the model.
  const shoe = merge(parts).translate(side * d.hipX, d.ankleY, 0);
  return weigh(shoe, rigid(side > 0 ? "ankleL" : "ankleR"));
}
