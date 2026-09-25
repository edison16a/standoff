import type { Body, MoveState } from "@/games/kit/camera";
import { NO_DEFENSE, type DefenseInput } from "../engine/types";

/**
 * A player's defence from the camera. Both gloves up in front of the face
 * is a block, dipping is a duck and leaning off the line is a slip. To get
 * up from a knockdown, both gloves go up: a guard counts, and so do both
 * hands raised over the head in the classic "I'm fine, ref" way.
 */
export function defenseFrom(moves: MoveState | null, body: Body | null): DefenseInput {
  if (!moves?.present) return { ...NO_DEFENSE };
  return {
    guard: moves.guard,
    duck: moves.ducking,
    slip: moves.lean,
    raise: moves.guard || (!!body && handsUp(body)),
  };
}

/** Both wrists above the nose. */
export function handsUp(body: Body): boolean {
  return body.arms.left.wrist.y < body.head.y && body.arms.right.wrist.y < body.head.y;
}
