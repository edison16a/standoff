import * as THREE from "three";
import { stageCeremony } from "../render/victory/staging";
import { FLOOR } from "../render/arena/dais";
import { CYCLE_S } from "./edit";

/** Where the fighters are on the line, and the game's own over the shoulder view, for the shots to frame. */
export interface Stage {
  /** Player one's and player two's places on the line, metres. */
  x1: number;
  x2: number;
  /** The Knight's own view as the player sees it, closing in on each hit. */
  shoulder: THREE.PerspectiveCamera;
}

interface Shot {
  /** The shot runs until this many seconds into the trailer. */
  until: number;
  /** Places `camera`. `k` runs 0 to 1 through the shot, for slow moves. Returns the camera to draw with. */
  place(camera: THREE.PerspectiveCamera, stage: Stage, k: number): THREE.PerspectiveCamera;
}

const look = new THREE.Vector3();

/** Puts a camera at `x, y, z` above the dais looking at `lx, ly, lz`, with the lens `fov`. */
function aim(camera: THREE.PerspectiveCamera, fov: number, x: number, y: number, z: number, lx: number, ly: number, lz: number): THREE.PerspectiveCamera {
  camera.position.set(x, FLOOR + y, z);
  camera.lookAt(look.set(lx, FLOOR + ly, lz));
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return camera;
}

const mid = (stage: Stage) => (stage.x1 + stage.x2) / 2;
/** The champion's front, as the ceremony's own camera finds it: the Knight wins the showcase. */
const FRONT = stageCeremony(1).startAngle;

/**
 * The trailer, cut by cut: a low dolly as both step in, tight on the
 * blades for the two clashes, the Knight's own view as the first cut
 * lands in slow motion, a low angle up at the Knight from behind the
 * Star Knight as the overhead comes, a slow arc round the winning cut
 * and its burst, and a low push in on the champion on the dais.
 */
const SHOTS: readonly Shot[] = [
  { until: 0.6, place: (c, s, k) => aim(c, 36, mid(s) - 0.9 + k * 0.5, 0.35, 3.3, mid(s), 1.35, 0) },
  { until: 1.85, place: (c, s, k) => aim(c, 34, mid(s) + 0.5 - k * 0.25, 0.9, 2.7, mid(s), 1.55, 0) },
  { until: 3.35, place: (c, s) => s.shoulder },
  { until: 4.3, place: (c, s, k) => aim(c, 40, s.x2 + 1.3 - k * 0.2, 0.45, -1.0, s.x1, 1.7, 0) },
  {
    until: 6.05,
    place: (c, s, k) => {
      const angle = -0.3 + k * 0.45;
      return aim(c, 34, mid(s) + Math.sin(angle) * 3.1, 0.95, Math.cos(angle) * 3.1, mid(s), 1.45, 0);
    },
  },
  {
    until: Infinity,
    place: (c, _s, k) => {
      const angle = FRONT - 0.15 + k * 0.3;
      const radius = 2.9 - k * 0.6;
      return aim(c, 46, Math.sin(angle) * radius, 0.45, Math.cos(angle) * radius, 0, 1.75, 0);
    },
  },
];

/** Which cut is on screen at `t` seconds into the trailer. */
export function shotAt(t: number): number {
  return SHOTS.findIndex((shot) => t < shot.until);
}

/** The trailer's camera at `t` seconds in. */
export function trailerCamera(camera: THREE.PerspectiveCamera, stage: Stage, t: number): THREE.PerspectiveCamera {
  const index = shotAt(t);
  const from = index > 0 ? SHOTS[index - 1]!.until : 0;
  const to = Math.min(SHOTS[index]!.until, CYCLE_S);
  return SHOTS[index]!.place(camera, stage, Math.min(1, (t - from) / (to - from)));
}

/**
 * The icon, a cover: in front of the Knight, low beside the Star Knight's
 * shoulder, so the Knight faces us as the blades first meet and the
 * sparks burst over his head.
 */
export function iconCamera(camera: THREE.PerspectiveCamera, stage: Stage): THREE.PerspectiveCamera {
  return tryCamera(camera, stage, [2.6, 0.45, 1.3, 0.45, 1.5, 0, 40]);
}

/** A camera from `[x, y, z, lx, ly, lz, fov]`, both x measured from the Knight, as the icon and the `?cam=` tuning aid use. */
export function tryCamera(camera: THREE.PerspectiveCamera, stage: Stage, v: readonly number[]): THREE.PerspectiveCamera {
  const [x = 0, y = 1, z = 3, lx = 0, ly = 1.5, lz = 0, fov = 40] = v;
  return aim(camera, fov, stage.x1 + x, y, z, stage.x1 + lx, ly, lz);
}

/** The poster: the first clash from low at the side of the dais, both fighters and the spray of sparks between them. */
export function posterCamera(camera: THREE.PerspectiveCamera, stage: Stage): THREE.PerspectiveCamera {
  return aim(camera, 36, mid(stage) - 0.3, 0.8, 3.0, mid(stage), 1.4, 0);
}
