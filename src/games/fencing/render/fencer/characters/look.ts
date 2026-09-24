import type * as THREE from "three";

/** What a character's model needs beyond its own design: the player's colour. */
export interface Look {
  /** Red for player one, green for player two, like the scoring lamps. */
  trim: THREE.ColorRepresentation;
}
