import * as THREE from "three";
import type { Arena } from "./arena/arena";

/** How the showcase grades its film: its own lights, the arena's fill and key scaled, and the haze's density. */
export interface CinemaLook {
  lights?: readonly THREE.Object3D[];
  fill?: number;
  key?: number;
  haze?: number;
}

/**
 * The showcase's film look: less fill and a harder rim light, so the
 * players stand out of a darker arena, thicker haze to sink the stands,
 * and no LED ribbons, whose words would read as captions in a wordless
 * trailer. A still adds its own lights and darkens further. Returns the
 * key light's scale and the exposure, since the renderer owns both.
 */
export function applyFilmLook(scene: THREE.Scene, arena: Arena, look: CinemaLook): { key: number; exposure: number } {
  const { lights = [], fill = 0.45, key = 1, haze = 0.028 } = look;
  if (lights.length) scene.add(...lights);
  arena.fill.intensity *= fill;
  arena.rim.intensity *= 2.6;
  arena.ribbons.visible = false;
  scene.fog = new THREE.FogExp2("#060812", haze);
  return { key, exposure: 1.12 / 1.05 };
}
