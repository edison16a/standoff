import type { Athlete } from "../types";
import { BODY } from "./body-spec";

/** The actions that carry the body through the air on their own clock and set its height themselves. */
const AIRBORNE_ACTIONS = new Set<Athlete["action"]["kind"]>(["shoot", "drive", "block"]);

/**
 * Brings a body down that was knocked out of a jump: a man posterized,
 * or bumped out of his block, goes into a stumble mid air. The stumble
 * owns no height, so without this he floated where he was hit, and stood
 * on air until his next jump. He falls under gravity to the floor.
 */
export function settleToFloor(a: Athlete, dt: number): void {
  if (AIRBORNE_ACTIONS.has(a.action.kind)) {
    a.fall = 0;
    return;
  }
  if (a.y <= 0) {
    a.y = 0;
    a.fall = 0;
    return;
  }
  a.fall = (a.fall ?? 0) + BODY.gravity * dt;
  a.y = Math.max(0, a.y - a.fall * dt);
}
