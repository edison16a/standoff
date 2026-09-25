/** The two boxers. 0 is player one, in the red corner. */
export type FighterId = 0 | 1;

export type Hand = "left" | "right";

/**
 * Every boxer is orthodox: the left straight is the jab, the right
 * straight is the cross, and either hand can hook.
 */
export type PunchStyle = "jab" | "cross" | "hook";

/** A spot on the canvas in metres, from the middle of the ring. */
export interface Spot {
  x: number;
  z: number;
}

/** What a boxer is doing to defend right now, from the camera or the computer's brain. */
export interface DefenseInput {
  /** Both gloves up in front of the face. */
  guard: boolean;
  /** Dipped under the line of a punch. */
  duck: boolean;
  /** Leaning off the line, -1 to their left or 1 to their right. */
  slip: -1 | 0 | 1;
  /** Both gloves raised, which is how a boxer who is down gets back up. */
  raise: boolean;
}

export const NO_DEFENSE: DefenseInput = { guard: false, duck: false, slip: 0, raise: false };

export function other(id: FighterId): FighterId {
  return id === 0 ? 1 : 0;
}

export function styleFor(hand: Hand, straight: boolean): PunchStyle {
  if (!straight) return "hook";
  return hand === "left" ? "jab" : "cross";
}
