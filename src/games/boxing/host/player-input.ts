import type { Body, Hand, MoveState } from "@/games/kit/camera";
import { copyDefense, NO_DEFENSE, type DefenseInput, type HeadSpot, type Level } from "../engine/types";
import { coverFrom, reachingOut } from "./gloves";

/**
 * A player's defence from the camera, all from the waist up: where their
 * head is (from `HeadReader`), where each glove is and so what it covers,
 * whether both gloves are held out to touch, and whether both are up.
 * To get up from a knockdown both gloves go up: a guard counts, and so
 * do both hands raised over the head in the classic "I'm fine, ref" way.
 */
export function defenseFrom(moves: MoveState | null, body: Body | null, head: HeadSpot = { x: 0, y: 0 }): DefenseInput {
  if (!moves?.present || !body) return copyDefense(NO_DEFENSE);
  return {
    guard: moves.guard,
    head: { ...head },
    cover: coverFrom(body),
    raise: moves.guard || handsUp(body),
    reach: reachingOut(body),
  };
}

/** Both wrists above the nose. */
export function handsUp(body: Body): boolean {
  return body.arms.left.wrist.y < body.head.y && body.arms.right.wrist.y < body.head.y;
}

/** A punch at the head lands with the wrist well over the shoulder. Level with it or under, in torso lengths, is digging to the body. */
const BODY_WRIST = 0.05;
/** Dipped this far under the head line, in shoulder widths, a punch goes to the body. */
const BODY_DIP = 0.3;

/**
 * Where a punch from the camera is going. Thrown low, or thrown while
 * dipping down, it is a body shot, as a real boxer digs to the body by
 * bending the knees. Anything else goes to the head.
 */
export function levelOf(moves: MoveState | null, body: Body | null, hand: Hand): Level {
  if (!body) return "head";
  const dipping = !!moves?.calibrated && moves.head.rise < -BODY_DIP;
  return dipping || body.arms[hand].offset.y > BODY_WRIST ? "body" : "head";
}
