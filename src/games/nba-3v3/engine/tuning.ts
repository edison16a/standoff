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
  /** Push off from a standstill, in metres per second squared. It fades toward top speed, so the last stretch takes a while. */
  burst: 17,
  fade: 0.6,
  /** Slowing down and turning use the grip of the shoes, which is stronger than the push. */
  brake: 21,
  grip: 15,
  /** A hard cut plants the outside foot and bleeds speed faster still. */
  plantGrip: 28,
  plantTime: 0.16,
  /** Carrying the ball costs a little push. */
  ballPush: 0.9,
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
  /** The green window at the free throw line is this much wider: a set shot, nobody in the face. */
  freeGreen: 1.25,
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
  fetchAt: 0.55,
  /** Walking pace to the spots, as a share of top speed. */
  walk: 0.9,
  onSpot: 0.35,
  /** The player who picked the ball up passes it out to the checker after this long. */
  outletAfter: 0.35,
  minDead: 1,
  /** A ball still out of bounds this long after the whistle is thrown back in. */
  giveUp: 1.6,
  /** Past this, everyone is put on their spot, so a lost ball never stalls the game. */
  maxDead: 5,
  /** The showcase skips the check and goes straight on after this long. */
  quick: 2.1,
  /** In the check: the bounce to the defender, the bounce back, and play is live. */
  firstPass: 0.35,
  secondPass: 1.05,
  beat: 1.75,
} as const;

/** The whistle for a foul and the free throws that follow, in seconds. */
export const FREE_THROW = {
  /** Everyone stops for the whistle before walking to the lane. */
  whistle: 0.9,
  /** Past this, everyone is put on their spot. */
  maxWalk: 3.5,
  /** A computer steps to the line and shoots after this long; a phone gets its shot taken after the longer wait. */
  botWait: 1.4,
  /** Two bounces at the line to settle before each shot. */
  bounces: 1,
  humanWait: 8,
  /** From the first shot leaving the hand to the ball going back to the shooter. */
  resultPause: 1.1,
  /** Where the shooter stands: just behind the free throw line, at the top of the key. */
  lineZ: COURT.keyDepth + 0.25,
  /** The lane spots run along both sides of the key, this far out from the middle. */
  laneX: COURT.keyHalfWidth + 0.35,
} as const;

/** Jumping: the crouch before leaving the floor, the time up there, and the legs gathering after. */
export const JUMP = {
  blockGather: 0.12,
  blockAir: 0.56,
  /** Seconds of slow legs after landing from a block, a jumper, and a dunk or layup. */
  blockRecover: 0.2,
  shotRecover: 0.12,
  driveRecover: 0.24,
} as const;

export const DEFENCE = {
  /** A steal needs the defender right next to the ball handler, body to body. */
  stealRange: 1.05,
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
