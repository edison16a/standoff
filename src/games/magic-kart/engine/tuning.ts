/**
 * Every number that shapes how the karts drive and how the race runs,
 * in one place so the feel can be tuned without hunting through code.
 * Speeds are metres per second, times are seconds.
 */
export const DRIVE = {
  topSpeed: 27,
  /** How fast the kart gains speed from a standstill. */
  accel: 17,
  brake: 34,
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
  /** Share of top speed needed before a drift can start. */
  minSpeed: 0.5,
  /** Seconds of drifting for the first and second spark colours. */
  blueAt: 0.9,
  orangeAt: 2,
  blueBoost: 0.7,
  orangeBoost: 1.25,
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
