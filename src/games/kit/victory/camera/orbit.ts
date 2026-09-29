export interface OrbitShot {
  /** The point circled, on the floor. */
  centre: { x: number; y?: number; z: number };
  /** Distance out from the centre once settled, in metres. */
  radius: number;
  /** Camera height, and the height it looks at. */
  height: number;
  lookHeight: number;
  /** Where round the centre it starts, in radians: 0 is out along +z. */
  angle?: number;
  /** Radians a second. Negative circles the other way. */
  speed?: number;
  /**
   * The opening move: the camera starts this many times further out and
   * this much higher, and eases in over `introS` seconds.
   */
  pullBack?: number;
  rise?: number;
  introS?: number;
  /** A slow rise and fall on top, in metres, so a long hold never looks locked off. */
  bob?: number;
}

export interface OrbitPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/**
 * Where a victory camera is `t` seconds into its shot: it eases in from
 * wide and high, then keeps circling the winner slowly. Pure, so the
 * same shot plays the same on any machine and at any frame rate.
 *
 *   const pose = orbitPose(shot, seconds);
 *   camera.position.set(pose.position.x, pose.position.y, pose.position.z);
 *   camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
 *
 * `OrbitCamera` in this folder does those two lines for a three.js camera.
 */
export function orbitPose(shot: OrbitShot, t: number): OrbitPose {
  const intro = shot.introS ?? 2.5;
  const k = easeOut(t / intro);
  const radius = shot.radius * (1 + ((shot.pullBack ?? 1.8) - 1) * (1 - k));
  const height = shot.height + (shot.rise ?? 1.5) * (1 - k) + Math.sin(t * 0.6) * (shot.bob ?? 0.06);
  const angle = (shot.angle ?? 0) + (shot.speed ?? 0.14) * t;
  const cy = shot.centre.y ?? 0;
  return {
    position: { x: shot.centre.x + Math.sin(angle) * radius, y: cy + height, z: shot.centre.z + Math.cos(angle) * radius },
    target: { x: shot.centre.x, y: cy + shot.lookHeight, z: shot.centre.z },
  };
}
