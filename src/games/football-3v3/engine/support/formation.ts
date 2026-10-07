import { attackSign } from "../../teams";
import type { Drive } from "../downs";
import { FIELD, YARD, yardToX } from "../field";
import { LINE } from "../tuning";
import type { Athlete } from "../types";
import { clamp, type V2 } from "../vec";
import { defenseJob, offenseJob, sideOf } from "./roster";

/** How deep each defensive layer sits off the ball, in yards. */
export const LAYERS = { backer: 9, deep: 20 } as const;

/**
 * Where a support player sets up for the snap. On offense the tackles
 * stretch the line on each end, the wings stand a step off its corners
 * and the lead back sits three yards deep off the QB's hip. On defence
 * the edges crowd the ends of the line, the backers sit nine yards off
 * either side of the ball and the deep man twenty yards back in the middle.
 */
export function supportSpot(a: Athlete, drive: Drive): V2 {
  const losX = yardToX(drive.offense, drive.los);
  const s = attackSign(drive.offense);
  const side = sideOf(a.slot);
  const zBall = drive.ballZ;
  const edge = FIELD.halfWidth - 2;
  const at = (x: number, z: number): V2 => ({ x: clamp(x, -(FIELD.endX - 1), FIELD.endX - 1), z: clamp(z, -edge, edge) });
  if (a.team === drive.offense) {
    const job = offenseJob(a.slot);
    if (job === "tackle") return at(losX - s * LINE.gap, zBall + side * 2 * LINE.spacing);
    if (job === "wing") return at(losX - s * 1.3, zBall + side * 3.1 * LINE.spacing);
    return at(losX - s * 3 * YARD, zBall - 1.4);
  }
  const job = defenseJob(a.slot);
  if (job === "edge") return at(losX + s * LINE.gap * 1.6, zBall + side * 2.6 * LINE.spacing);
  if (job === "backer") return at(losX + s * LAYERS.backer * YARD, zBall + side * 7);
  return at(losX + s * LAYERS.deep * YARD, zBall * 0.5);
}
