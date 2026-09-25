/**
 * Every number that shapes the match, in metres and seconds. The pitch
 * is a floodlit small sided cage: boards along the sides stop the ball
 * going out, and only the ends let it out, over the boards.
 */

/** The simulation runs at a fixed 60 steps a second so it plays the same on any screen. */
export const STEP = 1 / 60;

export const PITCH = {
  /** From the centre spot to each goal line. */
  halfLength: 21,
  /** From the centre spot to each side board. */
  halfWidth: 13,
  boardHeight: 1,
  /** From the middle of the goal to the centre of each post. */
  goalHalfWidth: 2.5,
  /** To the centre of the crossbar. */
  goalHeight: 2.1,
  goalDepth: 1.4,
  postRadius: 0.06,
  /** The keeper's area, a half circle around the goal. */
  boxRadius: 7,
  centreRadius: 3.8,
  /** A tall catch net behind each goal stops balls that go over the boards. */
  catchNet: 3.4,
} as const;

export const BALL = {
  radius: 0.11,
  gravity: 9.81,
  /** Air drag per metre travelled, so hard shots lose some pace. */
  drag: 0.009,
  /** Sideways swerve from spin, the curl on a finesse shot. */
  magnus: 0.011,
  /** How much a bounce off the turf keeps. */
  bounce: 0.52,
  /** Slowing of a rolling ball on the turf, metres per second squared. */
  roll: 1.9,
  boardBounce: 0.62,
  netBounce: 0.18,
  postBounce: 0.68,
  substeps: 4,
} as const;

export const MOVE = {
  accel: 28,
  /** Top speed at 60 pace and at 99 pace. */
  slowest: 5.6,
  fastest: 8.2,
  /** With the ball at the feet, scaled up by dribbling. */
  withBall: 0.86,
  charging: 0.55,
  turnRate: 13,
  turnWithBall: 8,
  /** Players never stand closer than this, so they bump instead of merging. */
  personalSpace: 0.62,
} as const;

export const TOUCH = {
  /** How close a loose ball must be to a player's feet to be controlled. */
  controlRange: 0.62,
  /** A ball faster than this may bounce off a player's first touch. */
  hardBall: 17,
  /** After a pass or a shot the ball ignores the kicker's feet for a moment. */
  afterKick: 0.35,
  /** How far ahead of the feet the ball rolls while dribbling. */
  carry: 0.46,
} as const;

export const SHOOT = {
  /** The backswing, from a placed shot to a full power one. */
  windup: 0.16,
  windupPower: 0.12,
  /** A press shortly before the ball arrives turns into a first time kick. */
  buffer: 0.35,
  /** Pace off the boot for an empty bar and a full one. */
  minSpeed: 14,
  maxSpeed: 32,
} as const;

export const PASS = {
  windup: 0.1,
  arrive: 5.6,
  maxSpeed: 24,
  cone: Math.PI * 0.42,
  /** The pace across the ground of a lofted pass, short and long. */
  loftMin: 9,
  loftMax: 18,
  /** A lofted ball lands this far short of the receiver and bounces up to them. */
  loftShort: 1.2,
} as const;

/** How Shoot reads the stick: see assist.ts. Angles in radians. */
export const ASSIST = {
  /** Less stick than this counts as centred. */
  deadZone: 0.35,
  /** A team mate this close to the stick's line gets the pass. */
  mateCone: 0.5,
  passReach: 32,
  /** Extra room either side of the goal mouth that still counts as aiming at it. */
  goalSlack: 0.32,
  /** How far a pass into space is played. */
  spaceLength: 11,
  /** Passes longer than this, or with a defender this close to the line, go in the air. */
  airLength: 18,
  laneWidth: 1.1,
} as const;

export const SLIDE = {
  duration: 0.6,
  speed: 9,
  friction: 9,
  /** The sliding boot is this far in front of the body. */
  reach: 0.85,
  contact: 0.7,
  getUp: 0.4,
  /** Extra time on the floor after a slide that won nothing. */
  missPenalty: 0.35,
  stumble: 0.75,
  hurdle: 0.45,
} as const;

export const KEEPER = {
  speed: 5.8,
  diveTime: 0.36,
  height: 1.9,
  /** From the boots to the gloves, stretched out with the arms above the head. */
  reach: 2.16,
  /** From the boots to the middle of the body, where a keeper gets up after a dive. */
  middle: 0.98,
  holdMin: 0.9,
  holdMax: 1.5,
  claimRange: 0.95,
  /** The closest a keeper stands to the goal line, in front of it. */
  lineGap: 0.3,
  getUp: 0.7,
} as const;

export const MATCH = {
  seconds: 240,
  goalsToWin: 5,
  kickoffWait: 1.6,
  celebrate: 3.4,
  replay: 5.8,
  outWait: 1.3,
  fullTimeWait: 1,
} as const;
