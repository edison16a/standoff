import * as THREE from "three";
import type { CoinScale } from "../render/world/collectibles";

/** How far round the runner's middle, in metres, a coin counts as in the way. */
const BODY_RADIUS = 1.1;
/** Closer to the lens than this, a coin fills the frame wherever it is, so it goes too. */
const LENS_CLEAR = 1.8;

const a = new THREE.Vector3();
const b = new THREE.Vector3();

/**
 * Shrinks coins that sit between a placed camera and the runner and would
 * cover them on screen, and any coin right up against the lens. It only
 * changes the drawing, so the run, and the computer runner's choices,
 * stay exactly the same. Coins ease out as they near the runner's
 * outline or the lens, so none of them pops.
 */
export function unblock(camera: THREE.PerspectiveCamera, subject: THREE.Vector3): CoinScale {
  camera.updateMatrixWorld();
  const eye = camera.position;
  const subjectDistance = eye.distanceTo(subject);
  const centre = a.copy(subject).project(camera);
  const cx = centre.x;
  const cy = centre.y;
  // The runner's outline on screen, in the projection's units (half the view's height is 1).
  const radius = BODY_RADIUS / (subjectDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  return (at) => {
    const near = eye.distanceTo(at);
    if (near > subjectDistance) return 1;
    const p = b.copy(at).project(camera);
    // Behind the lens, so never in the picture.
    if (p.z > 1) return 1;
    const d = Math.hypot((p.x - cx) * camera.aspect, p.y - cy);
    return Math.min(THREE.MathUtils.smoothstep(d, radius * 0.9, radius * 1.5), THREE.MathUtils.smoothstep(near, LENS_CLEAR * 0.5, LENS_CLEAR));
  };
}
