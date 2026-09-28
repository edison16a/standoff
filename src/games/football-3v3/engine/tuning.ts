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
  /** The QB is slower than a runner. */
  qbSpeed: 0.86,
  withBall: 0.97,
  /** Push at a standstill for a 95 kg player, fading to nothing at top speed. */
  push: 7.2,
  refMass: 95,
  /** Sideways grip: how hard a player can turn. Radius is speed squared over this. */
  grip: 8.5,
  /** Agility adds grip for sharper cuts. */
  gripPerAgility: 0.25,
  brake: 9,
  radius: 0.42,
  turnRate: 9,
} as const;

export const JUKE = {
  spin: { dur: 0.55, dodge: [0.06, 0.46], speed: 0.78 },
  back: { dur: 0.45, dodge: [0.08, 0.4], speed: 0.5 },
  side: { dur: 0.36, dodge: [0.04, 0.3], speed: 0.85 },
  /** Sideways shove of a side step or back move, metres a second. */
  hop: 4.2,
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
  contact: 1.05,
  /** On the ground after a missed tackle the runner dodged, and after a plain whiff. */
  missedDown: 1.8,
  whiffDown: 1.1,
  /** The last part of any time on the ground is getting up. */
  getUp: 0.6,
  cooldown: 0.6,
  diveTime: 0.7,
  diveSpeed: 7.5,
  /** Linemen grab a ball carrier who runs into them this often. */
  linemanGrab: 0.35,
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
  catchRadius: 0.95,
  diveCatchRadius: 1.9,
  /** A defender standing this close in front of the catch spot takes the ball. */
  jumpRadius: 2.1,
  /** A manual defender this close to the ball's path at catchable height picks it off. */
  pickRadius: 1.0,
  maxCatchY: 2.6,
  /** The ball bends toward a receiver who changes course, up to this acceleration. */
  assist: 5,
  spin: 62,
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
} as const;

export const BALL = {
  mass: 0.42,
  /** Drag per metre: half rho Cd A over m, nose first and side on. */
  dragNose: 0.0034,
  dragSide: 0.011,
  gravity: 9.81,
  /** How quickly a spiral's nose turns to follow its path. */
  noseFollow: 1.6,
  restitution: 0.45,
  groundFriction: 0.55,
} as const;

export const LINE = {
  /** Linemen set this far off the ball on each side. */
  gap: 0.55,
  spacing: 2.1,
  /** How hard a pair of linemen surge against each other. */
  surge: 0.9,
} as const;
