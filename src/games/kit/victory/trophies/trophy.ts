import type * as THREE from "three";
import type { TrophyMaterials } from "./materials";

export interface TrophyOptions {
  /** Overall height in metres. Each model is built true to size, then scaled to this. */
  height?: number;
  /** Share materials between several trophies. Made fresh when left out, and then owned by the trophy. */
  materials?: TrophyMaterials;
}

/** A trophy made in code, ready to add to a scene. */
export interface Trophy {
  /** Stands on y 0 and faces +z. */
  group: THREE.Group;
  /** Where hands take hold to lift it, in the group's space. */
  grip: THREE.Vector3;
  /** Height of the whole piece, after scaling. */
  height: number;
  dispose(): void;
}
