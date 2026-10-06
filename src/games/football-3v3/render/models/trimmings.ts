import * as THREE from "three";
import { shade } from "./geo";
import type { KitSpec } from "./kit";
import { dress, ramp, weigh, type Weights } from "./parts";
import type { Dims } from "./rig";
import { neckRadius } from "./torso";

/** A towel tucked in the front of the waistband, swinging a little with the left leg. */
export function towel(d: Dims): THREE.BufferGeometry {
  const H = d.height;
  const W = 1 + 0.2 * d.build;
  const g = dress(new THREE.BoxGeometry(0.075, 0.17, 0.006, 1, 5, 1), { colour: "#f7f7f5", rough: 0.95 }, {
    at: [0.05 * H, 0.598 * H - 0.085, 0.073 * H * W + 0.004], rot: [0.08, 0, 0.05],
  });
  return weigh(g, (p): Weights => {
    const swing = 0.45 * ramp(0.598 * H, 0.598 * H - 0.17, p.y);
    return [["hips", 1 - swing], ["hipL", swing]];
  });
}

/** A thick collar sitting on the pads behind the neck, as hitters wear. */
export function neckRoll(d: Dims, kit: KitSpec, detail: number): THREE.BufferGeometry {
  const H = d.height;
  const r = neckRadius(d) + 0.02 * H;
  const g = dress(new THREE.TorusGeometry(r, 0.017 * H, Math.round(10 * detail), Math.round(24 * detail), Math.PI * 1.15), { colour: shade(kit.jersey, -0.3), rough: 0.8 }, {
    at: [0, 0.842 * H, -0.006 * H], rot: [Math.PI / 2, 0, Math.PI * 0.925],
  });
  return weigh(g, () => [["spine", 1]]);
}
