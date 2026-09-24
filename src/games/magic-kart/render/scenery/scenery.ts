import type * as THREE from "three";

/** Everything around the road on one map, plus whatever in it moves. */
export interface Scenery {
  group: THREE.Group;
  update(time: number): void;
}
