/** The two boxers. 0 is player one, in the red corner. */
export type FighterId = 0 | 1;

export type Hand = "left" | "right";

/**
 * Every boxer is orthodox: the left straight is the jab, the right
 * straight is the cross, and either hand can hook.
 */
export type PunchStyle = "jab" | "cross" | "hook";

/** Where a punch is aimed: up at the head, or dug in to the body. */
export type Level = "head" | "body";

/** A spot on the canvas in metres, from the middle of the ring. */
export interface Spot {
  x: number;
  z: number;
}

/**
 * Where a boxer's head is against standing tall at home, in metres of the
 * boxer's own body: x toward the boxer's own right, y up. A duck is y well
 * under 0, a slip is x well off 0.
 */
export interface HeadSpot {
  x: number;
  y: number;
}

/**
 * How well one glove covers each target, 0 to 1. `face` is the glove in
 * front of the face, `side` is the glove up by the side of the head where
 * a hook lands, and `body` is the elbow down over the ribs.
 */
export interface Cover {
  face: number;
  side: number;
  body: number;
}

/** What a boxer is doing with their upper body right now, from the camera or the computer's brain. */
export interface DefenseInput {
  /** Both gloves up in front of the face, as a boxer covers up. */
  guard: boolean;
  /** Where the head is. Punches are judged against it as they land. */
  head: HeadSpot;
  /** Each glove's cover, for the boxer's own left and right hand. */
  cover: Record<Hand, Cover>;
  /** Both gloves raised, which is how a boxer who is down gets back up. */
  raise: boolean;
  /** Both gloves held straight out in front, to touch gloves before a round. */
  reach: boolean;
}

export const NO_COVER: Cover = { face: 0, side: 0, body: 0 };

export const NO_DEFENSE: DefenseInput = {
  guard: false,
  head: { x: 0, y: 0 },
  cover: { left: NO_COVER, right: NO_COVER },
  raise: false,
  reach: false,
};

export function other(id: FighterId): FighterId {
  return id === 0 ? 1 : 0;
}

export function otherHand(hand: Hand): Hand {
  return hand === "left" ? "right" : "left";
}

export function styleFor(hand: Hand, straight: boolean): PunchStyle {
  if (!straight) return "hook";
  return hand === "left" ? "jab" : "cross";
}

/** A copy that shares nothing with the original, since inputs are kept between frames. */
export function copyDefense(input: DefenseInput): DefenseInput {
  return {
    guard: input.guard,
    head: { ...input.head },
    cover: { left: { ...input.cover.left }, right: { ...input.cover.right } },
    raise: input.raise,
    reach: input.reach,
  };
}
