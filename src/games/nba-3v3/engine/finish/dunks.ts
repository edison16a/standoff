import type { DunkStyle } from "../../roster";
import type { DunkSpec } from "./spec";
import { DUNK_TRACKS as T } from "./tracks";

type Base = Pick<DunkSpec, "stop" | "shift" | "yaw" | "turn">;
const FRONT: Base = { stop: 0.36, shift: 0, yaw: "rim", turn: null };

/**
 * The dunks, each hand made. The body always gets high enough for the
 * hand to be over the ring with the ball (see `plan.ts`): the ball goes
 * down through the net from the hand, and the hand meets the rim.
 * `gather` and `air` are seconds; `hang` is the chance to hang on the
 * rim after the slam.
 */
export const DUNK_SPEC: Record<DunkStyle, DunkSpec> = {
  /** Two hand flush, alone at the rim. */
  twoHand: { ...FRONT, gather: 0.42, air: 0.42, steps: "two", track: T.twoUp, blendFrom: 1.45, hands: 2, hang: 0.35, power: 0.85 },
  /** One hand flush. */
  flush: { ...FRONT, gather: 0.38, air: 0.42, steps: "two", track: T.one, blendFrom: 1.4, hands: 1, hang: 0.2, power: 0.75 },
  /** One hand tomahawk, cocked behind the head at full speed. */
  tomahawk: { ...FRONT, gather: 0.4, air: 0.46, steps: "two", track: T.tomahawk, blendFrom: 1.65, hands: 1, hang: 0.4, power: 1 },
  /** Cock back: the whole body arched and the arm all the way back. */
  cockback: { ...FRONT, gather: 0.4, air: 0.48, steps: "two", track: T.cockback, blendFrom: 1.7, hands: 1, hang: 0.4, power: 1 },
  /** Two hand hammer, cocked back. */
  hammer: { ...FRONT, gather: 0.42, air: 0.46, steps: "two", track: T.hammer, blendFrom: 1.7, hands: 2, hang: 0.45, power: 1 },
  /** Baseline windmill: the ball round in a full circle. */
  windmill: { ...FRONT, gather: 0.42, air: 0.54, steps: "two", track: T.windmill, blendFrom: 1.8, hands: 1, hang: 0, power: 0.9 },
  /** Reverse: under the rim and slammed backwards over the head. */
  reverse: { stop: 0.34, shift: 0, yaw: "rim", turn: { turns: 0.5, during: "air" }, gather: 0.4, air: 0.5, steps: "two", track: T.reverse, blendFrom: 1.6, hands: 2, hang: 0, power: 0.8 },
  /** All the way round in the air. */
  spin360: { ...FRONT, turn: { turns: 1, during: "air" }, gather: 0.42, air: 0.56, steps: "two", track: T.twoUp, blendFrom: 1.7, hands: 2, hang: 0, power: 0.85 },
  /** Scooped up from low. */
  scoop: { ...FRONT, gather: 0.4, air: 0.46, steps: "two", track: T.scoop, blendFrom: 1.65, hands: 1, hang: 0.15, power: 0.8 },
  /** Pulled down to the waist at the top, then in. */
  clutch: { ...FRONT, gather: 0.42, air: 0.54, steps: "two", track: T.clutch, blendFrom: 1.75, hands: 2, hang: 0, power: 0.85 },
  /** Slammed and hung on the rim, legs swinging. */
  rimhang: { ...FRONT, gather: 0.42, air: 0.44, steps: "two", track: T.twoUp, blendFrom: 1.45, hands: 2, hang: 1, power: 0.9 },
  /** Poster: up through the man at the rim, one hand over him. */
  poster: { ...FRONT, stop: 0.4, gather: 0.4, air: 0.46, steps: "two", track: T.tomahawk, blendFrom: 1.6, hands: 1, hang: 0.5, power: 1 },
  /** Putback: off the offensive board straight back up with both hands. */
  putback: { ...FRONT, gather: 0.2, air: 0.38, steps: "stop", track: T.stop, blendFrom: 1.4, hands: 2, hang: 0.2, power: 0.95 },
  /** Alley oop finish: caught high on the run and thrown down in one motion. */
  alley: { ...FRONT, gather: 0.18, air: 0.42, steps: "one", track: T.catch, blendFrom: 1.35, hands: 1, hang: 0.3, power: 0.95 },
  /** Two hand dunk off a jump stop. */
  jumpStop: { ...FRONT, gather: 0.46, air: 0.42, steps: "stop", track: T.stop, blendFrom: 1.45, hands: 2, hang: 0.3, power: 0.9 },
};
