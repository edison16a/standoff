import type * as THREE from "three";
import type { FlameStyle } from "../effects/flame";
import type { V3 } from "./geo";
import type { Rig } from "./parts/driver-rig";

/**
 * A built kart, ready to be put in the scene as many times as needed.
 * The kart faces +z with its wheels on y = 0. Geometry is shared by
 * every copy, so four views of the same kart cost nothing extra. Paint,
 * chrome, rubber and lamps all live in the vertices (see kit/finish.ts),
 * so the body is one draw call and the driver another.
 */
export interface KartDesign {
  /** Bodywork, frame, engine and suspension: everything that rides on the springs. */
  body: THREE.BufferGeometry;
  /** The driver and the steering wheel, skinned to the bones in `rig`. */
  driver: THREE.BufferGeometry;
  /** Where the driver sits. The driver geometry is built around this point. */
  driverAt: V3;
  rig: Rig;
  wheels: WheelSpot[];
  /** Exhaust tips, where boost flames and puffs come out, pointing back. */
  exhausts: V3[];
  /** Fire from a combustion engine, or the blue plasma of a turbine. */
  flame: FlameStyle;
  /** Headlamps and tail lamps, for the glow sprites over them. */
  lamps: { head: V3[]; tail: V3[] };
  /** The top of the antenna that carries the player's colour flag. */
  flagAt: V3;
  /** Rough footprint, for the soft shadow. */
  length: number;
  width: number;
  /** The same kart cut coarser, drawn when it is far from the camera. */
  far?: { body: THREE.BufferGeometry; driver: THREE.BufferGeometry; wheels: THREE.BufferGeometry[] };
}

export interface WheelSpot {
  at: V3;
  geometry: THREE.BufferGeometry;
  radius: number;
  width: number;
  front: boolean;
}
