/**
 * The numbers that make the players move like athletes, in SI units.
 * Every limit is a real one: shoes on maple grip at about one g, legs
 * push with a limited power, and a body in the air follows gravity.
 */

export const BODY = {
  gravity: 9.81,
  /** Sneakers on clean maple: the most sideways or braking force a foot can take, as a share of body weight. */
  traction: 1.0,
  /** A deliberate plant digs the edge of the shoe in a little harder. */
  plantTraction: 1.15,
  /** Dribbling, the ball has to come round too, so a handler uses less of the grip. */
  ballGrip: 0.78,
  /**
   * Leg power over body mass, in watts per kilogram, for an average
   * build at average weight. Pushing is limited by grip at low speed and
   * by this power once moving, which is why the first steps are
   * explosive and the last bit of speed comes slowly.
   */
  power: 20,
  /** Extra power per speed point. */
  powerPerSpeed: 0.6,
  /** The weight the power figures are quoted at; heavier bodies have less power per kilogram. */
  refMass: 85,
  /** Carrying the ball costs a little of the push. */
  ballPower: 0.86,
} as const;

/** Bodies meeting: how much they bounce off each other and rub as they slide past. */
export const CONTACT = {
  /** Two bodies barely bounce: muscle and cloth soak up nearly everything. */
  restitution: 0.12,
  /** Shoulders sliding past each other in a screen lose some of the sideways speed. */
  friction: 0.3,
  /** A set player braces with the legs, as if a share heavier per strength point. */
  bracePerStrength: 0.05,
  /** Below this speed a player on the floor counts as set and can brace. */
  setSpeed: 1.2,
  /** A change of speed this big in one hit knocks a player off balance. */
  stagger: 2.4,
} as const;
