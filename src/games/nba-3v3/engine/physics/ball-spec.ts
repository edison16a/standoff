/**
 * The ball and what it meets, in SI units. A size 7 ball is a rubber
 * shell 24 cm across weighing 620 g. Every number here is measured or
 * worked out from a measurement, so the ball flies, spins and bounces
 * the way a real one does.
 */

export const BALL = {
  radius: 0.12,
  mass: 0.62,
  /** A thin shell: the moment of inertia is two thirds of m r squared. */
  inertia: 2 / 3,
  gravity: 9.81,
  /** Half the air density times the drag coefficient and the cross section, over the mass: 0.5 x 1.2 x 0.54 x pi 0.12^2 / 0.62. */
  drag: 0.0236,
  /** The Magnus lift over the mass, per radian a second and metre a second: 0.5 x 1.2 x pi 0.12^2 x 0.12 / 0.62, with lift about equal to the spin ratio. */
  magnus: 0.0053,
  /** The spin ratio past which the lift stops growing. */
  maxSpinRatio: 0.45,
  /** Air takes a little spin each second for every metre a second of speed. */
  spinDrag: 0.004,
} as const;

/** How a surface takes a bounce: restitution, friction, and how much restitution falls per metre a second of impact. */
export interface Surface {
  e: number;
  mu: number;
  soften: number;
}

/** Maple. FIBA asks a drop from 1.8 m to come back to between 1.2 and 1.4 m measured to the top of the ball. */
export const FLOOR: Surface = { e: 0.86, mu: 0.6, soften: 0.012 };
/** The steel ring on its spring loaded mount gives on a hard hit, so a clank is deader than a touch. */
export const IRON: Surface = { e: 0.6, mu: 0.4, soften: 0.03 };
/** Tempered glass in a steel frame. */
export const GLASS: Surface = { e: 0.72, mu: 0.3, soften: 0.01 };
/** The padding along the bottom of the board and the bracket's rubber cover. */
export const PAD: Surface = { e: 0.35, mu: 0.7, soften: 0 };

/** Below this speed into the floor the ball stops bouncing and rolls. */
export const REST_SPEED = 0.2;
/** Rolling resistance of a soft ball on hardwood, as a share of its weight. */
export const ROLLING = 0.025;

/** The fixed physics step: eight small steps in every 60 Hz frame, so the thin rim is never skipped. */
export const SUBSTEP = 1 / 480;

export function restitution(s: Surface, impact: number): number {
  return Math.max(0.2, s.e - s.soften * Math.max(0, impact - 1));
}
