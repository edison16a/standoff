/**
 * How a footballer moves at each speed. A walk is upright with long
 * loose arms and the body riding high over each stance; a jog leans in a
 * little with the elbows bent; a sprint drives the knees, pumps the arms
 * hard from hip to chin and leans well into the run. Everything blends
 * smoothly with speed, so there is never a pop between gaits.
 */
export interface GaitStyle {
  /** 0 walking, 1 running. */
  run: number;
  /** 0 a jog, 1 a flat out sprint. */
  sprint: number;
  /** Forward lean of the whole body, radians. */
  lean: number;
  /** How far the arms swing back and forward from the shoulder. */
  armBack: number;
  armFront: number;
  /** Elbow bend, radians. */
  elbow: number;
  /** How far the arms are held out from the sides. */
  armsOut: number;
  /** The pelvis turning with each stride, and the chest turning against it. */
  pelvisTwist: number;
  chestTwist: number;
  /** The swing side's hip dropping on each stance. */
  drop: number;
  /** How high the heel kicks up behind after toe off. */
  kickUp: number;
  /** How high the knee drives forward through the swing. */
  kneeDrive: number;
  /** The body's rise and fall through the stride, metres over the body's scale. */
  bob: number;
  /** How far the toes push off at the end of each stance. */
  pushOff: number;
}

const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

/** The style at `speed` metres a second. A dribbler shortens the arms and keeps the heels low, ready to touch the ball. */
export function styleOf(speed: number, dribbling: boolean): GaitStyle {
  const run = smooth((speed - 1.6) / 1.4);
  const sprint = smooth((speed - 5.2) / 2.2) * (dribbling ? 0.6 : 1);
  return {
    run,
    sprint,
    lean: 0.03 + 0.05 * run + 0.12 * sprint,
    armBack: (0.3 + 0.22 * run + 0.35 * sprint) * (dribbling ? 0.8 : 1),
    armFront: (0.28 + 0.32 * run + 0.62 * sprint) * (dribbling ? 0.75 : 1),
    elbow: 0.22 + 1.0 * run + 0.3 * sprint,
    armsOut: 0.1 + 0.08 * run - 0.03 * sprint + (dribbling ? 0.12 : 0),
    pelvisTwist: 0.07 + 0.03 * run + 0.04 * sprint,
    chestTwist: 0.08 + 0.06 * run + 0.08 * sprint,
    drop: 0.05 + 0.02 * run - 0.02 * sprint,
    kickUp: (0.12 + 0.55 * run + 0.45 * sprint) * (dribbling ? 0.45 : 1),
    kneeDrive: 0.05 * run + 0.1 * sprint * (dribbling ? 0.5 : 1),
    bob: 0.012 + 0.014 * run + 0.008 * sprint,
    pushOff: 0.3 + 0.25 * run + 0.15 * sprint,
  };
}
