/**
 * The numbers behind defending, fouls and set pieces, in metres and
 * seconds. Kept apart from tuning.ts so each file stays small.
 */

export const GUARD = {
  /** Guard works only within this distance of the man you mark. */
  range: 7,
  /** Between the man and our goal: tight on the ball, looser off it. */
  gapOnBall: 1.35,
  gapOff: 2.2,
  /** Off the ball the shadow drifts this share of the way toward the ball. */
  sag: 0.22,
  /** Shadowing runs at this share of the player's top speed, so full sprint is manual. */
  speed: 0.78,
  /** How quickly the shadow's spot catches up with where it should be, per second. */
  track: 7,
  /** A dribble drags it; a skill move leaves it far behind. */
  dribbleTrack: 2.2,
  skillTrack: 0.5,
  /** Stick pushed past this takes over from the shadow. */
  takeover: 0.3,
} as const;

export const STEAL = {
  duration: 0.42,
  /** When the lunging boot is at full stretch and meets the ball, or not. */
  contactAt: 0.15,
  reach: 1,
  /** Seconds before another steal or jump. */
  wait: 0.65,
  /** How often a steal that misses the ball clips the man instead, and more so from behind. */
  foul: 0.12,
  foulBehind: 0.4,
} as const;

export const JUMP = {
  duration: 0.62,
  /** How high the boots leave the turf at the top. */
  height: 0.42,
  /** Arms tucked in, as a wall jumps: the body blocks only a little over the head. */
  reach: 0.15,
  radius: 0.3,
} as const;

export const FOUL = {
  /** A slide this far behind the man (a dot product of the two directions) counts as from behind. */
  behind: 0.5,
  /** The chance a slide from behind is given as a foul. */
  slideFromBehind: 0.85,
  refereeRun: 7,
  /** Seconds the card is held up before the kick is set up. */
  cardFor: 1.7,
  /** The latest the card goes up, even if the referee is still on his way. */
  cardBy: 3.2,
} as const;

export const WALL = {
  /** The wall stands this far from the ball: close enough to shield the goal, far enough to beat it. */
  distance: 6.5,
  /** Further from goal than this, a free kick gets no wall. */
  range: 26,
  size: 3,
  /** Shoulder to shoulder. */
  spacing: 0.56,
} as const;

export const SET_KICK = {
  /** A free kick's pace off the boot and its launch angle, from an empty bar to a full one. */
  minSpeed: 16,
  maxSpeed: 29,
  minLoft: 0.1,
  maxLoft: 0.34,
  /** Sidespin at full curve, and the topspin that dips the ball. */
  sidespin: 22,
  topspin: 9,
  /** A penalty's pace, empty to full. */
  penaltyMin: 15,
  penaltyMax: 30,
  /** The power the white guide line assumes. */
  preview: 0.55,
  /** How fast the stick turns the aim, bends the curve, and moves a penalty's spot. */
  aimRate: 0.45,
  maxAim: 0.9,
  curveRate: 1.3,
  spotRate: 2.4,
  /** A computer taker waits this long, and a person this long before the kick is taken for them. */
  botThink: 1.6,
  patience: 16,
  /** Where the taker stands behind the ball, and the run up's pace. */
  runUp: 2.1,
  runPace: 5.2,
} as const;
