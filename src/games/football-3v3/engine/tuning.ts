/**
 * Every number that sets how the game feels, in yards, seconds and
 * kilograms. Kept together so tuning never means hunting through logic.
 */

/** The fixed simulation step. */
export const STEP = 1 / 60;

/** 9.81 m/s² in yards. */
export const GRAVITY = 9.81 / 0.9144;

export const BODY = {
  radius: 0.45,
  /** Top speed from the slowest to the fastest speed stat, yards a second. */
  slowest: 7.6,
  fastest: 10,
  /** A quarterback on offence runs this much slower than a runner. */
  qbFactor: 0.86,
  carrying: 0.95,
  /** Drive force per kilogram at a standstill, tapering to nothing at top speed. */
  drive: 6.2,
  driveStrength: 2.2,
  /** Braking is stronger than driving: players plant a foot. */
  brake: 13,
  /** Sideways grip, which sets the turning circle: radius = speed² / grip. */
  grip: 10,
  gripAgility: 5,
  /** Mass the grip and drive were tuned for; heavier bodies respond slower. */
  refMass: 95,
  /** Below this speed a player can step off in any direction. */
  standing: 0.8,
  /** How fast the body turns to face its run, radians a second. */
  turn: 9,
} as const;

export const JUKE = {
  /** Seconds each move takes for an average agility player. */
  spin: 0.6,
  back: 0.48,
  side: 0.36,
  /** Share of the run kept through each move. */
  spinKeep: 0.72,
  backKeep: 0.3,
  sideKeep: 0.8,
  /** A side step's sideways burst, yards a second. */
  sideBurst: 6.5,
  /** The back move steps back and across this fast. */
  backBurst: 3.2,
  /** Part of each move where a tackle whiffs, as a share of its length. */
  evadeFrom: 0.08,
  evadeTo: 0.75,
  cooldown: 0.75,
  /** Every juke adds heat, which cools off; hot players juke and run slower. */
  heatDecay: 0.3,
  heatCooldown: 0.7,
  heatLength: 0.22,
  heatSlow: 0.07,
  maxSlow: 0.35,
  /** The stick counts as pointing somewhere past this. */
  deadzone: 0.3,
} as const;

export const DIVE = {
  length: 0.55,
  /** The launch speed of a dive, yards a second. */
  burst: 5.5,
  /** Lying there, then getting up. */
  down: 0.9,
  /** Extra reach for a diving catch. */
  reach: 1.2,
} as const;

export const TACKLE = {
  /** A tackle press lunges only at a carrier this close. */
  range: 2.8,
  lunge: 0.34,
  lungeSpeed: 9,
  /** Bodies this close wrap up. */
  reach: 1.2,
  /** Share of the lunge that still steers after the carrier. */
  homing: 0.6,
  /** A whiff leaves the tackler on the grass this long. */
  missDown: 1.5,
  /** A press with nobody in range waits this long before another. */
  idleWait: 0.35,
  /** The base chance a carrier breaks a clean tackle, plus strength against strength. */
  breakBase: 0.08,
  breakStrength: 0.4,
  /** A tackle that is broken costs the tackler this long on the ground. */
  brokenDown: 1.1,
} as const;

export const LINE = {
  mass: 140,
  /** Linemen stand this far off the ball, and this far apart. */
  offBall: 0.75,
  spacing: 1.6,
  /** How hard a surge pushes, yards a second at most. */
  surge: 1.3,
  /** A lineman picks up a rusher who comes this close. */
  pickUp: 2.4,
  /** A rusher held by a block keeps this share of speed, more when rushing. */
  held: 0.3,
  heldRush: 0.6,
  /** Seconds tied up before a defender sheds the block and is through: far quicker with Rush. */
  shed: 2.4,
  shedRush: 0.55,
  /** A blocker this close has hold of him. */
  contact: 1.35,
} as const;

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

export const MATCH = {
  quarters: 4,
  quarterSeconds: 90,
  pointsToWin: 14,
  firstDown: 10,
  /** Each drive starts at the team's own 25 after a score or at the start of a half. */
  startLine: 25,
  touchback: 20,
  twoPointLine: 2,
  /** A play call left untouched is made for the team after this. */
  callWait: 12,
  /** The quarterback has this long to hike before the ball is snapped anyway. */
  hikeWindow: 5,
  deadWait: 1.8,
  scoreWait: 4.2,
  quarterBreak: 3,
  /** The host ends the replay; this only guards against it never doing so. */
  replay: 30,
  /** The final celebration before the host moves to the results. */
  finalWait: 6,
} as const;
