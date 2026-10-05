import type * as THREE from "three";
import type { V3 } from "../geo";
import type { KartDesign } from "../kart-design";
import { mergeParts, mirrored } from "../kit/part";
import { bakeOcclusion } from "../kit/occlusion";
import { driverBody, type SuitLook } from "../parts/driver-body";
import { makeRig, rigged, type Rig, type WheelSpec } from "../parts/driver-rig";
import { rearAxle, suspension, type GearSpec } from "../parts/running-gear";
import { buildWheel, type WheelLook } from "../parts/wheel";

export interface DesignParts {
  /** Parts on the centre line, or already on both sides (and anything with writing on it). */
  centre: THREE.BufferGeometry[];
  /** Parts on the right (+x) side, copied mirrored to the left. */
  sides: THREE.BufferGeometry[];
  gear: GearSpec;
  front: WheelLook;
  rear: WheelLook;
  seat: V3;
  wheel: WheelSpec;
  suit: SuitLook;
  /** The head, built round the rig's head joint, in driver space. */
  head: (rig: Rig) => THREE.BufferGeometry[];
  exhausts: V3[];
  lamps: KartDesign["lamps"];
  flagAt: V3;
  length: number;
  width: number;
  /** Shoulder half width and shoulder height of the driver. */
  shoulders?: readonly [number, number];
}

const flip = (p: V3): V3 => [-p[0], p[1], p[2]];

/**
 * Puts a design together: merges the bodywork with the running gear and
 * bakes its shading, builds the wheels, and rigs the driver to reach the
 * steering wheel.
 */
export function assemble(d: DesignParts): KartDesign {
  const body = mergeParts([...d.centre, ...mirrored([...d.sides, ...suspension(d.gear)]), ...rearAxle(d.gear)]);
  bakeOcclusion(body, 0, 0.9);
  const rig = makeRig(d.seat, d.wheel, d.shoulders?.[0], d.shoulders?.[1]);
  const driver = mergeParts([...driverBody(rig, d.suit), ...rigged(d.head(rig), "head")]);
  bakeOcclusion(driver, -d.seat[1], 0.5);
  const front = buildWheel(d.front);
  const rear = buildWheel(d.rear);
  const spot = (at: V3, geometry: THREE.BufferGeometry, look: WheelLook, isFront: boolean) => ({ at, geometry, radius: look.tyre.radius, width: look.tyre.width, front: isFront });
  return {
    body,
    driver,
    driverAt: d.seat,
    rig,
    wheels: [
      spot(d.gear.front, front, d.front, true),
      spot(flip(d.gear.front), front, d.front, true),
      spot(d.gear.rear, rear, d.rear, false),
      spot(flip(d.gear.rear), rear, d.rear, false),
    ],
    exhausts: d.exhausts,
    lamps: d.lamps,
    flagAt: d.flagAt,
    length: d.length,
    width: d.width,
  };
}
