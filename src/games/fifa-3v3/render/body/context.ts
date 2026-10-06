import type * as THREE from "three";
import type { Look } from "../../looks";
import type { ShirtSpan } from "./kit-layout";
import { dimsOf, restPositions, type BoneName, type Dims } from "./rig";

/** Everything a piece of the body needs to know to build itself. */
export interface BodyCtx {
  d: Dims;
  look: Look;
  rest: Record<BoneName, THREE.Vector3>;
  /** Built for close ups, or for the broadcast view (and weak devices), where a player is a couple of hundred pixels tall. */
  fine: boolean;
  /** Width and depth from the build: a powerful player is broader and thicker through. */
  wide: number;
  deep: number;
  /** Points round a big ring (the torso) and a small one (a forearm). */
  n: number;
  nSmall: number;
  /** The longest gap between rings, in metres. */
  step: number;
  /** Long sleeves and big gloves. */
  keeper: boolean;
  span: ShirtSpan;
}

export function bodyCtx(look: Look, keeper: boolean, fine: boolean): BodyCtx {
  const d = dimsOf(look);
  return {
    d,
    look,
    rest: restPositions(d),
    fine,
    wide: 0.92 + 0.16 * d.b,
    deep: 0.94 + 0.12 * d.b,
    n: fine ? 40 : 22,
    nSmall: fine ? 22 : 12,
    step: (fine ? 0.018 : 0.034) * d.s,
    keeper,
    span: { hem: 0.8 * d.s, collar: 1.535 * d.s },
  };
}
