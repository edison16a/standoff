/**
 * A slow circling camera for a winner, as pure numbers so it can be
 * tested. It opens wide and high, eases in to its orbit, then circles the
 * subject with a gentle rise and fall, the way a crane shot moves.
 */
export interface OrbitShot {
  /** What it circles, in world metres. */
  centre: { x: number; y: number; z: number };
  /** Distance out once settled, and height over the centre. */
  radius: number;
  height: number;
  /** Where it looks, over the centre. */
  lookHeight: number;
  /** Angle at the start, radians round +y from +z. */
  startAngle: number;
  /** Radians a second. Negative circles the other way. */
  speed: number;
  /** Seconds to ease in from the opening. */
  introS: number;
  /** The opening is this much further out, and this much higher. */
  pullBack: number;
  rise: number;
  /** How far the height rocks up and down while circling, metres. */
  bob: number;
  /** Swing back and forth instead of going all the way round: the arc's half width in radians, or 0 to circle. */
  arc: number;
}

export const DEFAULT_ORBIT: OrbitShot = {
  centre: { x: 0, y: 0, z: 0 },
  radius: 4,
  height: 1.6,
  lookHeight: 1.2,
  startAngle: 0,
  speed: 0.12,
  introS: 2.4,
  pullBack: 1.8,
  rise: 1.6,
  bob: 0.2,
  arc: 0,
};

export interface OrbitPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/** Where the camera is and what it looks at, `t` seconds into the shot. */
export function orbitPose(shot: OrbitShot, t: number): OrbitPose {
  const settle = ease(shot.introS > 0 ? t / shot.introS : 1);
  const turn = shot.arc > 0 ? Math.sin((t * shot.speed) / shot.arc) * shot.arc : t * shot.speed;
  const angle = shot.startAngle + turn;
  const radius = shot.radius * (1 + (shot.pullBack - 1) * (1 - settle));
  const height = shot.height + shot.rise * (1 - settle) + Math.sin(t * 0.5) * shot.bob * settle;
  const { x, y, z } = shot.centre;
  return {
    position: { x: x + Math.sin(angle) * radius, y: y + height, z: z + Math.cos(angle) * radius },
    target: { x, y: y + shot.lookHeight, z },
  };
}
