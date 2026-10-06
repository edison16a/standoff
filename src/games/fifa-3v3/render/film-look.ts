import * as THREE from "three";
import type { Arena } from "./arena/arena";
import type { Picture } from "./picture";

/** How the showcase grades its film: its own lights, the ground's soft and key light scaled, and how near the haze starts, in metres. */
export interface CinemaLook {
  lights?: readonly THREE.Object3D[];
  ambient?: number;
  key?: number;
  haze?: number;
}

/**
 * The showcase's film look: the stands and sky sunk in haze, less soft
 * light, a hotter exposure, and boards with no words, since a trailer
 * carries no captions. A still adds its own lights and darkens further.
 */
export function applyFilmLook(scene: THREE.Scene, picture: Picture, arena: Arena, look: CinemaLook): void {
  const { lights = [], ambient = 0.5, key = 1, haze = 55 } = look;
  if (lights.length) scene.add(...lights);
  arena.ambient.intensity *= ambient;
  arena.key.intensity *= key;
  arena.boards.wordless();
  picture.setExposure(1.05);
  scene.fog = new THREE.Fog("#070a16", haze * 0.35, haze * 2.2);
}
