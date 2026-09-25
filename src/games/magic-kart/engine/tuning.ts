/**
 * Every number that shapes how the karts drive and how the race runs,
 * in one place so the feel can be tuned without hunting through code.
 * Speeds are metres per second, times are seconds.
 */
export const DRIVE = {
  topSpeed: 27,
  /** How fast the kart gains speed from a standstill. It eases off nearer the top, so full pace takes about four seconds. */
  accel: 14,
  /** Above 1, so the last of the climb to top speed does not crawl forever. */
  accelCurve: 1.12,
  brake: 30,
  /** Brake starts at this share of its full force and reaches all of it after `brakeRamp` seconds held. */
  brakeBite: 0.3,
  brakeRamp: 0.6,
  reverseSpeed: 8,
  /** Speed lost per second with no pedal pressed. */
  coast: 3.5,
  /** Turn rate at full lock, radians per second. */
  turnRate: 2.25,
  /** Below this speed steering fades out, so a parked kart does not spin on the spot. */
  steerFullAt: 7,
  /** How quickly sideways sliding dies away. Higher is grippier. */
  grip: 11,
  driftGrip: 3.2,
  iceGrip: 1.1,
  gravity: 24,
  /** Top speed on sand, grass or dust beyond the kerb. */
  offroadFactor: 0.55,
  kerbFactor: 0.94,
  radius: 1.15,
};

export const DRIFT = {
  /** Share of top speed needed before braking into a bend starts a drift, and how hard the wheel must be turned. */
  minSpeed: 0.5,
  brakeSteer: 0.35,
  /** Lifting off Drive starts one only faster and turned harder, so easing off on a straight never does. */
  liftSpeed: 0.7,
  liftSteer: 0.6,
  /** Below this share of top speed a drift ends. */
  keepSpeed: 0.3,
  /**
   * A drift turns this share of full lock with the wheel straight, and the
   * wheel adds or takes away up to `turnRange`, so it can be held wide
   * through a gentle bend or tucked in tight through a hairpin.
   */
  turn: 0.55,
  turnRange: 0.5,
  /** Share of top speed a drift holds with Drive down. */
  powerTop: 0.97,
  /** Speed a drift sheds each second with Drive off, gliding, and with Brake held. */
  glide: 2.5,
  brakeGlide: 7,
  /** How much of the drift's grip is gone at top speed, so faster karts swing wider. */
  wide: 0.45,
  /** Seconds of drifting for each spark colour: blue, orange, then purple. */
  blueAt: 0.9,
  orangeAt: 1.9,
  purpleAt: 3.1,
  /** Seconds of turbo each colour pays when the drift ends. */
  blueBoost: 0.7,
  orangeBoost: 1.2,
  purpleBoost: 1.7,
};

/** The extra pace from keeping Drive held flat out. */
export const SURGE = {
  /** Seconds flat out, above `from` of top speed, before it starts, and how long it takes to build fully. */
  after: 2.2,
  build: 1.8,
  from: 0.85,
  /** Top speed gained at full surge. */
  bonus: 0.1,
  /** How fast it fades per second once Drive is let go. */
  fade: 1.2,
};

export const EFFECTS = {
  boostFactor: 1.42,
  nitro: 2.2,
  pad: 1.1,
  startBoost: 1.4,
  stun: 1.4,
  obstacleStun: 1,
  ice: 3.6,
  iceFactor: 0.72,
  invisible: 6.5,
  shield: 10,
  /** After a respawn nothing can hit you for this long. */
  respawnGrace: 1.8,
  /** After a spin out ends nothing can hit you for this long, so hits never chain. */
  afterSpin: 1,
  /** Seconds the item roulette spins before the item can be used. */
  roulette: 1.3,
};

export const RACE = {
  laps: 2,
  countdown: 3,
  checkpoints: 12,
  /** After the first player finishes, the others have this long. After a computer, twice that. */
  finishGrace: 30,
  /** Once every player is home, the computers have this long left. */
  computerGrace: 7,
  /** Seconds of pressing the pedal without getting anywhere before a kart is put back. */
  stuckAfter: 5,
  /** Seconds going the wrong way before the warning shows. */
  wrongWayAfter: 1.1,
  cubeRespawn: 4,
  /** Karts on the grid, with computer karts filling empty places. */
  gridSize: 4,
};

export const STEP = 1 / 60;
