import { seeded } from "../../engine/rng";

/** One block of stands: rows stepping back and up from a front edge. */
export interface Section {
  /** Front centre of the first row. */
  x: number;
  z: number;
  /** Which way the fans face, as a floor angle (0 faces +z). */
  yaw: number;
  width: number;
  rows: number;
}

/** One seat: where it is on the floor plan, its height, and which way it faces. */
export interface Seat {
  x: number;
  y: number;
  z: number;
  yaw: number;
  row: number;
  /** A number in [0, 1) fixed for this seat, for who sits in it. */
  luck: number;
}

export const ROW_DEPTH = 0.85;
export const ROW_RISE = 0.48;
export const SEAT = 0.58;
/** Blocks of about this many seats, split by aisles this wide. */
export const BLOCK = 14;
export const AISLE = 1.1;

/** The height of a row's tread. */
export function treadY(row: number): number {
  return 0.35 + row * ROW_RISE;
}

/**
 * Lays the seats out in each section: blocks of seats across, split by
 * aisles that run straight up the rows, the blocks centred on the
 * section. The aisles' centres are returned too, for the step lights.
 */
export function layoutSeats(sections: readonly Section[], seed = 33): { seats: Seat[]; aisles: { x: number; z: number; yaw: number; rows: number }[] } {
  const rng = seeded(seed);
  const seats: Seat[] = [];
  const aisles: { x: number; z: number; yaw: number; rows: number }[] = [];
  for (const s of sections) {
    // Blocks of about BLOCK seats, as many as fill the width, every seat the same pitch.
    const blocks = Math.max(1, Math.round((s.width + AISLE) / (BLOCK * SEAT + AISLE)));
    const perBlock = Math.floor((s.width - (blocks - 1) * AISLE) / blocks / SEAT);
    const blockWidth = perBlock * SEAT;
    const used = blocks * blockWidth + (blocks - 1) * AISLE;
    const fx = Math.sin(s.yaw);
    const fz = Math.cos(s.yaw);
    const rx = Math.cos(s.yaw);
    const rz = -Math.sin(s.yaw);
    for (let b = 0; b < blocks; b++) {
      const start = -used / 2 + b * (blockWidth + AISLE);
      if (b > 0) {
        const mid = start - AISLE / 2;
        aisles.push({ x: s.x + rx * mid, z: s.z + rz * mid, yaw: s.yaw, rows: s.rows });
      }
      for (let row = 0; row < s.rows; row++) {
        const back = row * ROW_DEPTH + 0.35;
        for (let i = 0; i < perBlock; i++) {
          const side = start + (i + 0.5) * SEAT + (rng() - 0.5) * 0.08;
          seats.push({ x: s.x + rx * side - fx * back, y: treadY(row), z: s.z + rz * side - fz * back, yaw: s.yaw, row, luck: rng() });
        }
      }
    }
  }
  return { seats, aisles };
}
