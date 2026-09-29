/** How throws, the ball and kicks behave, in yards and seconds. Split from tuning.ts to keep each short. */

export const THROW = {
  /** Throw stick past this picks a target. */
  deadzone: 0.35,
  /** Only receivers in front of the aim within this angle can be picked. */
  cone: (70 * Math.PI) / 180,
  /** Launch speed from a weak arm to a cannon, yards a second, used for flight time. */
  slowArm: 20,
  fastArm: 27,
  /** Longer throws get extra hang time, to arc over coverage. */
  loft: 0.012,
  minFlight: 0.35,
  maxFlight: 3.2,
  /** The ball reaches the catch point at chest height. */
  chest: 1.35,
  /** Catch reach for the target, a bit generous because the throw is assisted. */
  catchReach: 1.7,
  /** Anyone else needs to be this close to the ball to touch it. */
  touchReach: 0.95,
  /** How high a jumping player reaches. */
  jumpReach: 3.2,
  /** A defender this close to the receiver as the ball arrives may knock it away. */
  contest: 1.3,
  breakup: 0.55,
  /** A defender this close to the catch point, in front of the target, takes it every time. */
  pickZone: 2.4,
  pickLine: 1.5,
  /** Chance a defender in the path intercepts rather than tips it, from poor to great hands. */
  pickLow: 0.3,
  pickHigh: 0.7,
  /** Spiral spin, radians a second, from a weak arm to a cannon (about 500 to 700 rpm). */
  spinLow: 52,
  spinHigh: 73,
  /** Wobble in radians: a clean throw, plus extra when rushed or juking. */
  wobble: 0.04,
  wobbleRushed: 0.16,
  throwTime: 0.4,
} as const;

export const BALL = {
  /** Quadratic drag per yard for a tight spiral, and for a tumbling kick. */
  spiralDrag: 0.0025,
  tumbleDrag: 0.0055,
  /** How fast a spiral's nose swings to follow its path, per second. */
  follow: 2.6,
  /** Wobble dies away at this rate, per second. */
  wobbleDamp: 0.6,
  /** Nutation frequency of the wobble, radians a second. */
  nutation: 18,
  /** A kick turns end over end this fast, radians a second. */
  tumble: 12,
  /** Where the ball sits when carried or snapped. */
  carryHeight: 1.1,
  snapTime: 0.32,
  restitution: 0.35,
} as const;

export const KICK = {
  /** A bar sweeps its whole range in this many seconds. */
  aimPeriod: 1.3,
  powerPeriod: 1.5,
  /** Inside this on the accuracy bar is the green: dead straight. */
  green: 0.14,
  /** The worst miss off line, at either end of the bar. */
  maxError: (8 * Math.PI) / 180,
  /** A bar that is never stopped stops itself. */
  autoStop: 6,
  /** Field goals and extra points, then punts: launch angle and speed. */
  goalAngle: (38 * Math.PI) / 180,
  goalSlow: 14,
  goalFast: 31,
  puntAngle: (52 * Math.PI) / 180,
  puntSlow: 14,
  puntFast: 28,
  /** The kick is taken this far behind the line of scrimmage. */
  setBack: 7,
  /** A field goal is the kick call when the posts are at most this many yards away. */
  goalRange: 57,
  /** Extra points are snapped from the 15 yard line. */
  patLine: 15,
  /** The windup before the boot meets the ball. */
  windup: 0.45,
  resultWait: 2.4,
} as const;
