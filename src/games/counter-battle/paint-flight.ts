/**
 * How fast a paintball flies on screen, metres per second. The engine
 * settles every shot at once; the drawing and the sound let the ball
 * travel, so the splat and its pop land together a moment after the shot.
 */
export const BALL_SPEED = 85;

/** The most a ball is shown in flight, so a shot across the whole field still lands quickly. */
const MAX_FLIGHT = 0.5;

/** Seconds a ball takes to fly `distance` metres. */
export function flightTime(distance: number): number {
  return Math.min(MAX_FLIGHT, Math.max(0, distance) / BALL_SPEED);
}
