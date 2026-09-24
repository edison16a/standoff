import type * as THREE from "three";
import type { Match } from "../engine/match";
import type { ShoulderCamera } from "../render/cameras/shoulder-camera";
import type { TvCamera } from "../render/cameras/tv-camera";

/**
 * The trailer's cuts, by seconds into the loop: a low tracking shot of
 * the exchange, the player's own view over the red corner's shoulder,
 * a tight low angle on the knockout blow, and a crane up over the ring
 * as the blue corner lies on the canvas.
 */
export function trailerShot(cycle: number, match: Match, tv: TvCamera, shoulder: ShoulderCamera, dt: number, cut: boolean): THREE.PerspectiveCamera {
  const [a, b] = match.footwork.spots;
  if (cycle < 2.35) {
    tv.setFov(32);
    tv.sideOn(a, b, 0.3 + cycle * 0.06, 3.0, 1.5, 1.3);
    tv.finish(dt);
    return tv.camera;
  }
  if (cycle < 4.55) {
    shoulder.camera.fov = 52;
    shoulder.camera.updateProjectionMatrix();
    shoulder.update(a, b, dt, 0);
    if (cut) shoulder.snap();
    return shoulder.camera;
  }
  if (cycle < 6.55) {
    tv.setFov(30);
    tv.sideOn(a, b, -0.6 + (cycle - 4.55) * 0.08, 2.4, 1.15, 1.35, 0.62);
    tv.finish(dt);
    return tv.camera;
  }
  tv.setFov(36);
  tv.orbit(b, 0.8 + (cycle - 6.55) * 0.25, 4.2, 3.4, 0.5);
  tv.finish(dt);
  return tv.camera;
}

/** The icon's square key art: low and close as the hook lands, looking up at both boxers. */
export function iconShot(match: Match, tv: TvCamera): THREE.PerspectiveCamera {
  const [a, b] = match.footwork.spots;
  tv.setFov(40);
  tv.sideOn(a, b, -0.35, 2.2, 1.05, 1.5, 0.55);
  return tv.camera;
}

/** The poster: the knockout blow, side on and wide enough to see the ring and the crowd. */
export function posterShot(match: Match, tv: TvCamera): THREE.PerspectiveCamera {
  const [a, b] = match.footwork.spots;
  tv.setFov(32);
  tv.sideOn(a, b, 0.15, 2.9, 1.3, 1.35, 0.55);
  return tv.camera;
}
