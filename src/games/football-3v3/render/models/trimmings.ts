import * as THREE from "three";
import { shade } from "./geo";
import type { KitSpec } from "./kit";
import { dress, ramp, weigh, type Weights } from "./parts";
import type { Dims } from "./rig";
import { neckRadius } from "./torso";

/** A towel tucked in the waistband over the left hip, draping out over the thigh and swinging with it. */
export function towel(d: Dims): THREE.BufferGeometry {
  const H = d.height;
  const W = 1 + 0.2 * d.build;
  const len = 0.16;
  const g = dress(new THREE.BoxGeometry(0.07, len, 0.005, 3, 8, 1), { colour: "#ecebe6", rough: 0.97 }, {});
  // Hung from its top edge, it bows out over the thigh and the free corner curls a little.
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const drop = (len / 2 - pos.getY(i)) / len;
    pos.setZ(i, pos.getZ(i) + 0.022 * Math.sin(drop * Math.PI * 0.8) + 0.006 * drop * pos.getX(i) / 0.035);
  }
  g.computeVertexNormals();
  g.rotateY(0.45);
  g.translate(0.075 * H * W, 0.6 * H - len / 2, 0.052 * H * W);
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
