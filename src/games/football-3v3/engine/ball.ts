import type { Flight } from "./flight";
import type { BallState } from "./types";
import type { V2, V3 } from "./vec";

/** A pass in the air: who threw it, who it is for and who, if anyone, will take it away. */
export interface PassInfo {
  from: number;
  to: number;
  /** A defender standing in front of the target at the throw: the ball is theirs. */
  interceptor: number | null;
  /** Where the ball was thrown to meet the receiver, and when. */
  spot: V2;
  arrive: number;
  t: number;
  /** Release speed in metres a second and spin in turns a second, for the replay's numbers. */
  speed: number;
  rps: number;
  /** Where the throw left the hand, for tracing it. */
  release: V3;
  /** Match time of the release. */
  at: number;
  /** Computer defenders who already had their one swipe at it. */
  swiped: number[];
}

/**
 * The ball. Held, it rides in the holder's arm and `pos` follows them;
 * in the air (snap, pass, kick or loose after an incompletion or a
 * landing) it flies on `flight`.
 */
export interface Ball {
  state: BallState;
  holder: number | null;
  pos: V3;
  flight: Flight | null;
  pass: PassInfo | null;
}

export function newBall(): Ball {
  return { state: "dead", holder: null, pos: { x: 0, y: 0.15, z: 0 }, flight: null, pass: null };
}
