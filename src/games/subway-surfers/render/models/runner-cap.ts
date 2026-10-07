import * as THREE from "three";
import { badgeMaterial } from "../art/badge-art";
import type { V3 } from "../mesh-builder";
import type { Dresser } from "./rig";
import { gloss, HEAD_R, HEAD_Y, satin, shadeOf, type Look } from "./runner-look";
import { FRONT, peakGeometry, shell } from "./shapes";

/** The crown's radius, just over the head, and how far the cap tips its front up. */
const CR = HEAD_R + 0.018;
const TILT = 0.3;
const C: V3 = [0, HEAD_Y + 0.07, 0.012];
/** The crown is a touch flatter than a ball. */
const SQUASH: V3 = [1.02, 0.86, 1.02];

/**
 * A baseball cap worn forward: a red crown in six panels with yellow front
 * panels and the runner's own sprayed badge, a red peak with a yellow
 * underside, a button on top, and a strap over a gap of hair at the back,
 * which is what the chase camera sees most.
 */
export function dressCap(dress: Dresser, look: Look): void {
  const head = dress.on("head");
  const tilt: V3 = [TILT, 0, 0];
  const crown = satin(look.cap);
  head.add(shell(CR, [0, Math.PI * 2], [0, Math.PI / 2], 40), crown, C, tilt, SQUASH);
  head.add(shell(CR + 0.003, [FRONT - 0.78, FRONT + 0.78], [0.1, Math.PI / 2], 44), satin(look.capFront), C, tilt, SQUASH);
  // A flat dome sunk into the crown at its rim leaves an arch of hair showing above the strap and its buckle.
  head.sphere(0.046, satin(shadeOf(look.hair, 0.85)), at([0, 0, CR * SQUASH[2] - 0.004]), [1.15, 1.25, 0.3], 16, tilt);
  head.box(0.12, 0.02, 0.012, satin(shadeOf(look.cap, 0.8)), at([0, 0.012, CR * SQUASH[2] + 0.008]), tilt);
  head.box(0.03, 0.026, 0.01, gloss(0xd9dde4), at([0.03, 0.012, CR * SQUASH[2] + 0.013]), tilt);
  head.sphere(0.02, satin(look.capFront), at([0, CR * SQUASH[1], 0]), [1, 0.6, 1], 10, tilt);

  // The peak leaves the crown at the front of its rim and reaches out level, bent down at its sides.
  const peakTilt: V3 = [-0.06, 0, 0];
  head.add(peakGeometry(CR * 0.98, 0.018, 1.62, 0.035), satin(look.cap), [0, HEAD_Y + 0.152, 0], peakTilt);
  head.add(peakGeometry(CR * 0.96, 0.008, 1.6, 0.035), satin(look.capFront), [0, HEAD_Y + 0.14, 0], peakTilt);

  const face = dress.detail("head");
  // Seams down the crown between its six panels, and the eyelets at the top of each.
  for (let i = 0; i < 6; i++) {
    const seam = new THREE.TorusGeometry(CR + 0.004, 0.0028, 4, 20, Math.PI / 2);
    face.add(seam, satin(shadeOf(look.cap, 0.62)), C, [TILT, (i / 6) * Math.PI * 2 + Math.PI / 6, 0], SQUASH);
  }
  for (const side of [-1, 1]) {
    face.sphere(0.008, satin(shadeOf(look.cap, 0.55)), at([side * CR * 0.62, CR * 0.62, 0.02]), [1, 1, 0.5], 6, tilt);
  }
  const badge = badgeMaterial();
  if (badge) face.add(shell(CR + 0.0065, [FRONT - 0.55, FRONT + 0.55], [0.62, 1.42], 36), badge, C, tilt, SQUASH);
}

/** A point on the cap, from its own frame into the head's: tipped, then moved onto the head. */
function at(local: V3): V3 {
  const v = new THREE.Vector3(local[0], local[1], local[2]).applyAxisAngle(new THREE.Vector3(1, 0, 0), TILT);
  return [v.x + C[0], v.y + C[1], v.z + C[2]];
}
