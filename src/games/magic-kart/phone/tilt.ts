import { clamp, conjugate, DEG, rotate, vec, wrapAngle, type Quat } from "@/games/kit/motion/math3d";

/**
 * Steering from the phone held like a steering wheel: sideways, upright,
 * screen facing the player. Turning the wheel is turning the phone in the
 * plane of its screen, and clockwise steers right.
 *
 * The maths works from where "up" points in the phone's own frame. Its
 * direction across the screen is the wheel angle. Tipping the phone back
 * or forward only shortens that part without turning it, so the angle
 * holds however the phone leans. Laid almost flat there is too little of
 * it left to trust, so the reading eases over to how far the right end
 * has dropped, which steers the same way. No Euler angles are involved,
 * so nothing flips at their limits, and the compass plays no part, so the
 * gyro's slow drift cannot creep in.
 */

export interface Tilt {
  /** Radians, positive with the phone turned clockwise, like a wheel turning right. */
  wheel: number;
  /** Radians the screen leans back from upright, positive as it faces the sky. */
  lean: number;
}

/**
 * Wheel angle that means full lock. Tune between 45 and 60 degrees. It is
 * wide on purpose, so a slight shift of the hands gives a slight turn and
 * only a real turn of the phone throws the kart hard over.
 */
export const FULL_LOCK = 50 * DEG;
/** A small dead zone so a wheel held about level drives straight. */
export const DEAD_ZONE = 3 * DEG;
/**
 * Share of the response that is straight linear. The rest is cubic, which
 * stays soft through small turns for fine control and firms up near full
 * lock. With 0.7, about 25 degrees gives a third of lock, enough to start
 * a braking drift, and about 36 degrees starts one by lifting off.
 */
const LINEAR_SHARE = 0.7;
/** How much of "up" must lie across the screen for its direction to be trusted fully, and at all. */
const ACROSS_SURE = Math.sin(35 * DEG);
const ACROSS_NONE = Math.sin(15 * DEG);

function quarter(angle: number): number {
  return (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
}

/**
 * Which way is up on the page, as an angle across the screen from the
 * phone's own x axis (its right edge when upright). The page turned 90
 * degrees means the phone is turned anticlockwise, top edge on the left.
 */
export function pageUp(angle: number): number {
  return (90 - quarter(angle)) * DEG;
}

export function tiltOf(q: Quat, angle: number): Tilt {
  const up = rotate(conjugate(q), vec(0, 0, 1));
  const a = pageUp(angle);
  // The parts of "up" along the page's up and along its right, both across the screen.
  const alongUp = up.x * Math.cos(a) + up.y * Math.sin(a);
  const alongRight = up.x * Math.sin(a) - up.y * Math.cos(a);
  const turned = Math.atan2(-alongRight, alongUp);
  const dropped = Math.asin(clamp(-alongRight, -1, 1));
  const t = clamp((Math.hypot(alongUp, alongRight) - ACROSS_NONE) / (ACROSS_SURE - ACROSS_NONE), 0, 1);
  const sure = t * t * (3 - 2 * t);
  return { wheel: sure * turned + (1 - sure) * dropped, lean: Math.asin(clamp(up.z, -1, 1)) };
}

/**
 * Steering from -1 to 1, measured from the wheel angle captured at
 * calibration. The curve is gentle near the middle for fine corrections
 * on straights and firm near full lock for hairpins. It has no smoothing
 * here, since the host's physics already eases the wheel. Past a right
 * angle the phone is close to upside down, and the reading could wrap
 * round to the other side, so it keeps the lock it had.
 */
export function steerFromWheel(wheel: number, zero: number, last = 0): number {
  const off = wrapAngle(wheel - zero);
  if (Math.abs(off) > 90 * DEG && last !== 0) return Math.sign(last);
  const m = Math.min(1, Math.max(0, Math.abs(off) - DEAD_ZONE) / (FULL_LOCK - DEAD_ZONE));
  return Math.sign(off) * (LINEAR_SHARE * m + (1 - LINEAR_SHARE) * m * m * m);
}

/** Which way the page is turned, allowing for old iPhones and for desktop browsers that report 0 in a wide window. */
export function screenAngle(): number {
  if (typeof window === "undefined") return 90;
  const legacy = (window as { orientation?: number }).orientation;
  const reported = screen.orientation ? screen.orientation.angle : (legacy ?? 0);
  const wide = window.innerWidth > window.innerHeight;
  if (wide && quarter(reported) % 180 === 0) return 90;
  return quarter(reported);
}

/**
 * The page turn the wheel is read against. Only the two landscape turns
 * count. A hard turn of the wheel can make the phone swing the page
 * upright for a moment, and taking that as the new up would throw the
 * steering a quarter turn, so the last landscape turn holds instead.
 */
export function wheelAngle(reported: number, previous: number): number {
  const turn = quarter(reported);
  return turn === 90 || turn === 270 ? turn : previous;
}
