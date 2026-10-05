import type * as THREE from "three";
import { mergeParts } from "../kit/part";
import { buildRim, type RimStyle } from "./rim";
import { buildTyre, type TyreStyle } from "./tyre";

export interface WheelLook {
  tyre: TyreStyle;
  rim: RimStyle;
}

/**
 * A whole wheel, tyre and rim, as one geometry with its axle along x and
 * the rim facing +x. The model turns the left hand ones round. Built once
 * per design and shared by every copy of the kart.
 */
export function buildWheel(look: WheelLook): THREE.BufferGeometry {
  const { tyre, rim } = look;
  const rimR = tyre.radius * tyre.bead;
  // The face sits a little in from the sidewall, so the tyre frames it.
  const face = (tyre.width / 2) * (rim.kind === "dish" ? 0.7 : 0.62);
  return mergeParts([...buildTyre(tyre), ...buildRim(rim, rimR, tyre.width, face)]);
}
