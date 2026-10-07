/** Every number that shapes play, in one place. Metres, seconds, kilograms. */

/** The fixed simulation step. The host steps the match at this rate. */
export const STEP = 1 / 60;

export const RULES = {
  /** First to this many points wins. */
  target: 14,
  quarters: 4,
  /** Live ball seconds per quarter. The clock only runs while the ball is live. */
  quarterSeconds: 150,
  /** Yards to gain for a new set of downs. */
  toGain: 10,
  /** Where a drive starts after a score, the touchback spot. */
  driveStart: 25,
  /** A touchback after a punt or an interception in the end zone. */
  touchback: 20,
  /** The spot for a two point try and for a conversion kick. */
  twoPointSpot: 98,
  kickTrySpot: 85,
  /** Seconds the QB has to pick kick or throw before throw is picked for them. */
  chooseSeconds: 10,
  /** The window to hike before the ball is snapped anyway. */
  hikeSeconds: 5,
  /** The whistle and the walk back between plays. */
  deadSeconds: 2.2,
  touchdownSeconds: 3.6,
  /** A field goal is tried from inside this distance; farther out a kick is a punt. */
  fieldGoalRange: 58,
  /** The field goal kicker stands this far behind the line; a punter farther. */
  fgDepth: 7,
  puntDepth: 12,
} as const;

export const MOVE = {
  /** Top speed from speed 0 to 10: about 7.6 to 9.6 metres a second. */
  baseSpeed: 7.6,
  perSpeed: 0.2,
  withBall: 0.93,
  /** Push at a standstill for a 95 kg player, fading to nothing at top speed. */
  push: 7.2,
  refMass: 95,
  /**
   * The cleats' grip: a friction circle that speeding up, braking and
   * turning share, metres a second squared. Agility adds to it.
   */
  grip: 9,
  gripPerAgility: 0.25,
  /** How much a heavier body loses of that grip: grip times (refMass / mass) to this power. */
  gripMass: 0.35,
  /** Share of the grip left for turning sideways at top speed: a sprinter has to plant to cut. */
  carve: 0.6,
  radius: 0.42,
  turnRate: 9,
  /** A jolt bigger than this change of speed shakes a player's footing. */
  jolt: 2.6,
  /** Shaken: this share of the grip and of top speed. */
  staggerGrip: 0.5,
  staggerPace: 0.8,
  /** The bodies' physics runs in this many sub steps a match step. */
  substeps: 2,
} as const;

export const JUKE = {
  /** `plant` is how long the planted foot pushes before the run settles. */
  spin: { dur: 0.55, dodge: [0.06, 0.46], speed: 0.78, plant: 0.14 },
  back: { dur: 0.45, dodge: [0.08, 0.4], speed: 0.5, plant: 0.26 },
  side: { dur: 0.36, dodge: [0.04, 0.3], speed: 0.85, plant: 0.24 },
  /** Sideways speed a side step or back move pushes off for, metres a second. */
  hop: 4.2,
  /** How hard a planted foot pushes the body, metres a second squared, and what agility adds. */
  grip: 22,
  gripPerAgility: 0.8,
  cooldown: 0.7,
  /** Each juke adds heat; heat cools this fast. Hot jukes are slower and so is the runner. */
  heatPerJuke: 1,
  cool: 0.55,
  heatFree: 1.2,
} as const;

export const TACKLE = {
  /** A tackle press lunges only if the ball carrier is this close. */
  range: 2.7,
  lungeSpeed: 8.5,
  lungeTime: 0.5,
  contact: 1.2,
  /** How fast a lunge turns after a runner in its first moments, radians a second. */
  homing: 3.5,
  /** On the ground after a missed tackle the runner dodged, and after a plain whiff. */
  missedDown: 1.8,
  whiffDown: 1.3,
  /** On the ground after bouncing off a carrier who ran through the tackle. */
  shedDown: 1.4,
  /** The last part of any time on the ground is getting up. */
  getUp: 0.6,
  cooldown: 0.6,
  diveTime: 0.7,
  diveSpeed: 7.5,
  /** A lineman gets a hand free for a ball carrier running past this often; then it is an arm tackle. */
  linemanGrab: 0.45,
} as const;

export const RUSH = {
  time: 1.1,
  cooldown: 2.4,
  boost: 1.12,
  /** How much of their speed a player keeps pushing through a blocker, plain and rushing. */
  blocked: 0.35,
  rushing: 0.8,
  contact: 1.25,
} as const;

export const PASS = {
  /** Where the ball leaves the QB's hand and where a receiver catches it. */
  releaseHeight: 2.0,
  catchHeight: 1.3,
  windup: 0.18,
  throwTime: 0.45,
  /** How fast the passer turns square to his target through the motion, radians a second. */
  turnRate: 18,
  spin: 62,
} as const;

/**
 * The QB as a passer is clearly slower than everyone else, slowest just
 * after the snap while he sets up, then picking up a little. Once he
 * presses Run (or crosses the line) he moves like any runner.
 */
export const QB_PACE = {
  /** Share of a normal top speed at the snap, and once he is settled. */
  early: 0.55,
  late: 0.78,
  /** Seconds after the snap to go from early to late. */
  ramp: 3,
} as const;

/** The pitch on a run call: a short soft lob to the back beside the QB. */
export const PITCH = {
  /** Hang time: slow enough to see, quick enough that the rush cannot get there. */
  time: 0.5,
  releaseHeight: 1.5,
  spin: 30,
  /** The back lines up this far outside the QB, and a yard deeper. */
  wide: 2.6,
  deeper: 1,
} as const;

export const KICK = {
  /** Accuracy swings left to right and power up and down, in these periods. */
  aimPeriod: 1.3,
  powerPeriod: 1.5,
  /** The green zone in the middle of the accuracy bar. */
  green: 0.12,
  /** A meter not stopped in this long stops itself. */
  meterLimit: 6,
  windup: 0.32,
  minSpeed: 17,
  maxSpeed: 29.5,
  /** Worst sideways miss in radians at the ends of the bar. */
  spray: 0.2,
  fgAngle: 0.66,
  puntAngle: 0.9,
  /** End over end turn of a place kick, radians a second, and the twist a kick off the green picks up. */
  tumble: 24,
  twist: 0.25,
  /** Spin of a well struck punt's spiral, radians a second. */
  puntSpin: 70,
} as const;

/** The ball's shape, air and bounce live in physics/; these are for quick sums. */
export const BALL = {
  mass: 0.42,
  gravity: 9.81,
} as const;

export const LINE = {
  /** Linemen set this far off the ball on each side. */
  gap: 0.55,
  spacing: 2.1,
  /** How hard a pair of linemen surge against each other. */
  surge: 0.9,
  /** Leg drive behind a full surge, newtons, and the cleats' hold against the pair moving, newton seconds a metre. */
  drive: 1000,
  hold: 1250,
  /** A lineman's grab out of his block holds this share of a lunging tackler's. */
  grabWrap: 0.3,
} as const;
