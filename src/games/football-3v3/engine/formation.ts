import { attackSign } from "../teams";
import { inFieldGoalRange, type Drive } from "./downs";
import { FIELD, YARD, yardToX } from "./field";
import { backSpot } from "./run-play";
import { LINE, RULES } from "./tuning";
import type { Athlete, PlayCall } from "./types";
import { clamp, type V2 } from "./vec";

/** The QB's shotgun depth in yards. */
const QB_DEPTH = 5;

/** Where a receiver lines up across the field, per slot, before clamping to the field. */
const WIDE = [-13, 13];

/**
 * Every player's spot for the next snap. Linemen square up over the
 * ball, receivers split wide on the line, the QB sits five yards back in
 * the shotgun (or seven or twelve to kick) with the back beside him on a
 * run call, and the defence mirrors the
 * receivers with its QB as a linebacker in the middle.
 */
export function formationSpot(a: Athlete, drive: Drive, call: PlayCall, back: number | null = null): V2 {
  const losX = yardToX(drive.offense, drive.los);
  const zBall = drive.ballZ;
  const onOffense = a.team === drive.offense;
  const s = attackSign(drive.offense);
  const edge = FIELD.halfWidth - 3;
  if (a.role === "lineman") {
    const z = zBall + (a.slot - 1) * LINE.spacing;
    return { x: losX + (onOffense ? -s : s) * LINE.gap, z };
  }
  if (a.role === "qb") {
    if (!onOffense) return { x: losX + s * 6 * YARD, z: zBall };
    const depth = call === "kick" ? (kickIsFieldGoal(drive) ? RULES.fgDepth : RULES.puntDepth) : QB_DEPTH;
    return { x: losX - s * depth * YARD, z: zBall };
  }
  if (onOffense && a.id === back) return backSpot({ x: losX - s * QB_DEPTH * YARD, z: zBall }, s, zBall);
  const z = clamp(zBall + (WIDE[a.slot] ?? 0), -edge, edge);
  if (onOffense) return { x: losX - s * 1, z };
  return { x: losX + s * 7 * YARD, z };
}

/** A kick in range, or any try after a touchdown, goes for the posts; anything else is a punt. */
export const kickIsFieldGoal = (drive: Drive) => drive.conversion || inFieldGoalRange(drive);

/** Everyone to their spot, standing still and facing the line. */
export function lineUp(athletes: readonly Athlete[], drive: Drive, call: PlayCall, back: number | null = null): void {
  for (const a of athletes) {
    const p = formationSpot(a, drive, call, back);
    a.x = p.x;
    a.z = p.z;
    a.vx = 0;
    a.vz = 0;
    a.move = { x: 0, z: 0 };
    a.aim = null;
    a.guard = null;
    a.action = { kind: "none" };
    // Each side faces the way it attacks, so the two lines face each other.
    a.yaw = attackSign(a.team) > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

/** Before the snap nobody crosses the line: defenders are held on their side of it. */
export function holdOnside(a: Athlete, drive: Drive): void {
  const losX = yardToX(drive.offense, drive.los);
  const s = attackSign(drive.offense);
  const min = LINE.gap * 1.2;
  if (a.team !== drive.offense && (a.x - losX) * s < min) {
    a.x = losX + s * min;
    if (a.vx * s < 0) a.vx = 0;
  }
}
