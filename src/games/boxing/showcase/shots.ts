import type * as THREE from "three";
import type { Match } from "../engine/match";
import type { ShoulderCamera } from "../render/cameras/shoulder-camera";
import type { Spot, TvCamera } from "../render/cameras/tv-camera";
import type { Ceremony } from "../render/victory/ceremony";
import { CYCLE_S } from "./trailer";

/** What a shot can frame: the fight, both cameras and the ceremony. */
export interface ShotRig {
  match: Match;
  tv: TvCamera;
  shoulder: ShoulderCamera;
  ceremony: Ceremony;
}

interface Shot {
  /** The shot runs until this many seconds into the loop. */
  until: number;
  /** Places the camera. `k` runs 0 to 1 through the shot, for slow pushes. */
  place(rig: ShotRig, k: number, dt: number, cut: boolean): THREE.PerspectiveCamera;
}

const CENTRE: Spot = { x: 0, z: 0 };

/** A broadcast camera placement, side on to the boxers and pushed through `k`. */
function side(fov: number, swing: number, distance: number, height: number, lookY: number, bias: number) {
  return ({ match, tv }: ShotRig, _k: number, dt: number): THREE.PerspectiveCamera => {
    const [a, b] = match.footwork.spots;
    tv.setFov(fov);
    tv.sideOn(a, b, swing, distance, height, lookY, bias);
    tv.finish(dt);
    return tv.camera;
  };
}

/**
 * The trailer, cut by cut. Close and low through the exchange so every
 * punch fills the frame, the red corner's own view for the counter, a
 * push in on the red boxer's face as he loads the hook, the blow itself
 * tight in slow motion, the fall from the canvas, and a low angle up at
 * the champion as the belt goes over his head.
 */
const SHOTS: readonly Shot[] = [
  { until: 1.25, place: (rig, k, dt) => side(28, 0.35 + k * 0.12, 2.3, 1.05, 1.5, 0.4)(rig, k, dt) },
  {
    until: 2.45,
    place: ({ match, shoulder }, _k, dt, cut) => {
      const [a, b] = match.footwork.spots;
      shoulder.camera.fov = 48;
      shoulder.camera.updateProjectionMatrix();
      shoulder.update(a, b, dt, 0, cut);
      return shoulder.camera;
    },
  },
  { until: 3.55, place: (rig, k, dt) => side(34, Math.PI - 0.5 + k * 0.1, 2.5, 0.55, 1.3, 0.55)(rig, k, dt) },
  { until: 5.15, place: (rig, k, dt) => side(27 - k * 3, -0.95 + k * 0.1, 2.3 - k * 0.3, 1.35, 1.55, 0.3)(rig, k, dt) },
  { until: 5.95, place: (rig, k, dt) => side(24, 0.2 + k * 0.05, 1.7, 1.45, 1.52, 0.78)(rig, k, dt) },
  { until: 7.3, place: (rig, k, dt) => side(36, -1.05 + k * 0.15, 2.6, 0.35, 0.9, 0.9)(rig, k, dt) },
  {
    until: Infinity,
    place: ({ tv, ceremony }, k, dt) => {
      tv.setFov(38);
      tv.orbit(CENTRE, ceremony.front + 0.25 - k * 0.3, 3.3 - k * 0.6, 0.75, 1.75);
      tv.finish(dt);
      return tv.camera;
    },
  },
];

/** Which cut is on screen at `cycle` seconds into the loop, or -1 before it starts. */
export function shotIndex(cycle: number): number {
  if (cycle < 0) return -1;
  return SHOTS.findIndex((shot) => cycle < shot.until);
}

/** Places the trailer's camera for `cycle` seconds into the loop. `cut` is true on a shot's first frame. */
export function trailerShot(cycle: number, rig: ShotRig, dt: number, cut: boolean): THREE.PerspectiveCamera {
  const index = shotIndex(cycle);
  const from = index > 0 ? SHOTS[index - 1]!.until : 0;
  const to = Math.min(SHOTS[index]!.until, CYCLE_S);
  return SHOTS[index]!.place(rig, Math.min(1, (cycle - from) / (to - from)), dt, cut);
}

/** The icon's key art: low over the puncher's shoulder, the glove on the jaw and the other boxer's face as it snaps round. */
export function iconShot([a, b]: readonly [Spot, Spot], tv: TvCamera): THREE.PerspectiveCamera {
  tv.setFov(36);
  tv.sideOn(a, b, 2.75, 2.3, 0.6, 1.35, 0.68);
  return tv.camera;
}

/** The poster: the knockout blow from ringside, low enough to look up at both boxers with the arena dark behind. */
export function posterShot([a, b]: readonly [Spot, Spot], tv: TvCamera): THREE.PerspectiveCamera {
  tv.setFov(30);
  tv.sideOn(a, b, 0.2, 2.5, 0.65, 1.42, 0.6);
  return tv.camera;
}
