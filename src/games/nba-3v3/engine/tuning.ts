/**
 * Every number that sets how the game feels, in metres and seconds. The
 * court is a FIBA half court: x runs along the baseline (right is
 * positive), z runs out from the baseline toward the camera, y is up.
 */

export const STEP = 1 / 60;

export const COURT = {
  halfWidth: 7.5,
  /** From the baseline to the top of the half court. */
  depth: 11,
  arcRadius: 6.75,
  /** The straight part of the arc in the corners, this far from the middle. */
  cornerX: 6.6,
  /** The painted key: 4.9 metres wide and 5.8 deep. */
  keyHalfWidth: 2.45,
  keyDepth: 5.8,
  /** Where the ball is checked after a make or a turnover. */
  check: { x: 0, z: 9.2 },
} as const;

export const RIM = {
  x: 0,
  y: 3.05,
  z: 1.575,
  /** Inside radius of the ring, to the middle of the tube. */
  radius: 0.235,
  tube: 0.011,
} as const;

export const BOARD = {
  /** The playing face of the glass. */
  face: 1.2,
  thickness: 0.05,
  halfWidth: 0.9,
  bottom: 2.9,
  top: 3.95,
} as const;

export const NET = { depth: 0.45 } as const;

export const BALL = {
  radius: 0.12,
  gravity: 9.81,
  floorBounce: 0.74,
  rimBounce: 0.55,
  boardBounce: 0.6,
  /** Horizontal speed kept per second while rolling on the floor. */
  rollKeep: 0.45,
} as const;

export const MOVE = {
  /** Top speed is base plus this per speed point. */
  baseSpeed: 4.1,
  perSpeed: 0.28,
  withBall: 0.93,
  accel: 24,
  radius: 0.4,
} as const;

export const SHOT = {
  /** The meter takes this long to fill. */
  meterMs: 820,
  /** Where the green window sits along the meter, 0 to 1. */
  greenAt: 0.8,
  /** Half the green window in milliseconds, plus a bit more per shooting point. */
  greenBase: 46,
  greenPerShooting: 5,
  /** A good release is this many green widths from the centre. */
  goodSpread: 2.3,
  /** Holding past a full meter throws the shot anyway, late. */
  autoReleaseAt: 1.18,
  /** When the shooter leaves the floor, along the meter. */
  takeoff: 0.36,
  /** Inside this distance a drive at the rim becomes a layup or a dunk. */
  driveRange: 3.3,
  closeRange: 1.7,
} as const;

export const RULES = {
  target: 11,
  shotClock: 12,
  countdown: 3,
} as const;

/** The break after a basket or a turnover, and the check up that ends it. */
export const CHECK = {
  /** Everyone takes in the moment before anyone moves. */
  fetchAt: 0.7,
  /** Walking pace to the spots, as a share of top speed. */
  walk: 0.8,
  onSpot: 0.35,
  /** The player who picked the ball up passes it out to the checker after this long. */
  outletAfter: 0.35,
  minDead: 1.1,
  /** Past this, everyone is put on their spot, so a lost ball never stalls the game. */
  maxDead: 5,
  /** The showcase skips the check and goes straight on after this long. */
  quick: 2.1,
  /** In the check: the bounce to the defender, the bounce back, and play is live. */
  firstPass: 0.35,
  secondPass: 1.05,
  beat: 1.75,
} as const;

export const DEFENCE = {
  stealRange: 1.55,
  stealCooldown: 1.1,
  /** A whiffed steal leaves the defender off balance this long. */
  whiffTime: 0.45,
  blockCooldown: 0.9,
  /** A player who just lost the ball cannot grab it again straight away. */
  grabCooldown: 0.45,
} as const;

export const PASS = {
  speed: 12.5,
  lobSpeed: 8,
  interceptRange: 0.45,
} as const;

export const GRAVITY = 9.81;
