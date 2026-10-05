/**
 * The match ball, the air and the surfaces it meets, in SI units. The
 * ball is a size 5 ball inside the FIFA limits (68 to 70 cm round, 410
 * to 450 g). The air numbers follow wind tunnel studies of modern match
 * balls, and the turf the FIFA Quality Programme's rebound and roll
 * tests. Gameplay never edits these: they are the world the ball lives in.
 */

export const BALL_BODY = {
  /** 22 cm across. */
  radius: 0.11,
  mass: 0.43,
  /** A thin pressurised shell: I = 2/3 m r squared. */
  inertia: 2 / 3,
} as const;

export const AIR = {
  density: 1.2,
  gravity: 9.81,
} as const;

/**
 * Drag and lift. Below about 10 m/s the flow round the ball is smooth
 * and peels off early, so drag is high. Between 10 and 16 m/s the
 * boundary layer turns turbulent and clings on: the drag crisis, where
 * drag halves. A hard shot rides the low drag, then slows into the high
 * drag and dips. Spin adds lift across the flow (the Magnus effect),
 * which saturates for a fast spinning ball.
 */
export const AERO = {
  cdSlow: 0.47,
  cdFast: 0.19,
  crisisSpeed: 12.5,
  crisisWidth: 1.5,
  /** Drag creeps back up past the crisis. */
  cdRise: 0.0016,
  /** A spinning ball drags a thicker wake. */
  cdSpin: 0.1,
  liftMax: 0.45,
  /** The spin ratio (surface speed over ball speed) where lift is three quarters grown. */
  liftScale: 0.28,
  /** Air friction on the spinning cover: spin falls about a fifth each second. */
  spinDecay: 0.2,
  /** A ball with hardly any spin swims about in its own wake: the knuckleball. */
  knuckleSpin: 0.04,
  knuckleSpeed: 17,
  knuckleLift: 0.05,
  /** Metres of flight per swing of the knuckle's sideways push. */
  knuckleWave: 7,
} as const;

/**
 * Natural grass. A ball dropped from 2 m comes back up about 0.75 m
 * (the FIFA test asks for 0.6 to 1 m). Restitution falls the harder the
 * ball lands, since the ball and the turf flatten more.
 */
export const TURF = {
  restSlow: 0.74,
  restDrop: 0.017,
  restMin: 0.42,
  /** Sliding friction between the cover and wet grass. */
  friction: 0.5,
  /** Rolling resistance as a share of the ball's weight, about 0.6 m/s per second. */
  rolling: 0.062,
  /** The blades hold a fast rolling ball back more: extra slowing per m/s of roll. */
  grassDrag: 0.045,
  /** Slower than this off the turf, a bounce dies into a roll. */
  settle: 0.35,
  /** Sidespin is scrubbed off by the turf while the ball rolls, per second. */
  spinScrub: 3,
} as const;

/** Round aluminium posts and bar, painted, and the padded boards. */
export const FRAME = {
  postRestitution: 0.66,
  /** Harder hits flatten the ball more and give back less. */
  postDrop: 0.006,
  postFriction: 0.25,
  boardRestitution: 0.6,
  boardFriction: 0.35,
  /** The cage net above the side boards and the catch nets behind the goals. */
  cageRestitution: 0.16,
  cageFriction: 0.7,
} as const;

/**
 * The goal net. Each panel is a loose sheet held by the frame that gives
 * where the ball meets it: a spring to the frame, well damped, with the
 * mass of the netting that moves. A hard shot pushes the back of the net
 * well over half a metre out and drops dead; near the frame the sheet is
 * tauter and gives less.
 */
export const NET = {
  /** Effective moving mass of a panel's netting, kg. */
  mass: 0.35,
  stiffness: 70,
  /**
   * Damping as a share of critical with the ball in it. The mesh stretches
   * freely but comes back slowly, its knots and cords soaking up the
   * energy, so the ball dies in the net instead of being fired back out.
   */
  dampOut: 0.5,
  dampBack: 2.6,
  /** The furthest a panel can be pushed out. */
  maxDepth: 0.95,
  /** How much the netting drags on a ball sliding along it, per second. */
  grab: 7,
  /** Half width of the dent the ball makes, metres. */
  spread: 0.55,
} as const;

/** Ball steps per match step: 480 a second, so even a 40 m/s strike moves under a ball's radius per step. */
export const SUBSTEPS = 8;
