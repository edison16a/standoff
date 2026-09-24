import type * as THREE from "three";
import type { V3 } from "./geo";

/**
 * A built kart, ready to be put in the scene as many times as needed.
 * The kart faces +z with its wheels on y = 0. Geometry is shared by
 * every copy, so four views of the same kart cost nothing extra.
 */
export interface KartDesign {
  /** The chassis and bodywork, lit. */
  body: THREE.BufferGeometry;
  /** Lights, neon and glowing trim, drawn at full brightness. */
  glow: THREE.BufferGeometry | null;
  /** The driver, which leans into corners on its own. */
  driver: THREE.BufferGeometry;
  /** Glowing bits of the driver, like a visor, built around the same point. */
  driverGlow?: THREE.BufferGeometry;
  /** Where the driver sits. The driver geometry is built around this point. */
  driverAt: V3;
  wheels: WheelSpot[];
  /** Where boost flames and exhaust puffs come out. */
  exhausts: V3[];
  /** The top of the antenna that carries the player's colour flag. */
  flagAt: V3;
  /** Rough footprint, for the soft shadow. */
  length: number;
  width: number;
}

export interface WheelSpot {
  at: V3;
  geometry: THREE.BufferGeometry;
  radius: number;
  front: boolean;
}
