import { FIELD, YARD } from "../../engine/field";

/**
 * Where every painted mark on the field goes, in field metres with x
 * along the length (0 at midfield) and z across. Plain data, so the
 * layout can be tested without a canvas.
 */

export interface Line {
  x: number;
  /** Across the field, from z0 to z1. */
  z0: number;
  z1: number;
  /** Width along x, metres. */
  width: number;
}

export interface Numeral {
  x: number;
  z: number;
  text: string;
  /** The numbers read from the sideline they are nearest, so the far ones are upside down to the camera. */
  flip: boolean;
}

/** A 4 inch line; the goal lines are twice as wide. */
export const LINE_WIDTH = 0.1016;
const HASH_LENGTH = 0.6096;
/** The tops of the numbers sit 12 yards in from each sideline, and they are 2 yards tall. */
const NUMBER_IN = 12 * YARD;
export const NUMBER_HEIGHT = 2 * YARD;

const xAt = (yard: number) => (yard - 50) * YARD;

/** Full width lines every 5 yards, goal line to goal line. */
export function yardLines(): Line[] {
  const out: Line[] = [];
  for (let y = 0; y <= 100; y += 5) {
    const goal = y === 0 || y === 100;
    out.push({ x: xAt(y), z0: -FIELD.halfWidth, z1: FIELD.halfWidth, width: goal ? LINE_WIDTH * 2 : LINE_WIDTH });
  }
  return out;
}

/** Short ticks at every other yard: along both sidelines and at both rows of hash marks. */
export function hashMarks(): Line[] {
  const out: Line[] = [];
  const w = FIELD.halfWidth;
  for (let y = 1; y < 100; y++) {
    if (y % 5 === 0) continue;
    const x = xAt(y);
    for (const side of [-1, 1]) {
      out.push({ x, z0: side * (w - 0.1), z1: side * (w - 0.1 - HASH_LENGTH), width: LINE_WIDTH });
      out.push({ x, z0: side * FIELD.hashZ, z1: side * (FIELD.hashZ + HASH_LENGTH), width: LINE_WIDTH });
    }
  }
  return out;
}

/** The 10 to 50 and back to 10, on both halves of the field, facing their own sideline. */
export function numerals(): Numeral[] {
  const out: Numeral[] = [];
  for (let y = 10; y <= 90; y += 10) {
    const text = String(y <= 50 ? y : 100 - y);
    for (const side of [-1, 1] as const) {
      out.push({ x: xAt(y), z: side * (FIELD.halfWidth - NUMBER_IN + NUMBER_HEIGHT / 2), text, flip: side < 0 });
    }
  }
  return out;
}

/** Each end zone's span along x: the one Storm defends at negative x, Blaze's at positive x. */
export const END_ZONES = [
  { team: 0 as const, x0: -FIELD.endX, x1: -FIELD.goalX },
  { team: 1 as const, x0: FIELD.goalX, x1: FIELD.endX },
];
