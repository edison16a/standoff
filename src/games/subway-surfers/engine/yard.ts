import { MOVE_GAP_S, speedAt } from "./tuning";

/**
 * How hard the yard pushes, on top of how far along the pace a run
 * starts. Easy, Medium and Hard all lay the usual yard from a later
 * start. Demon tightens it too.
 */
export interface Yard {
  /** The pace is this many times the usual pace at the same place. */
  pace: number;
  /** The least seconds between two moves the course asks for. */
  moveGap: number;
  /**
   * The busiest the pattern mix gets, where 1 is the usual busiest. Past
   * 1 the hardest patterns come more often, the stretches between them
   * shrink toward a move and a breath, and trains roll in faster.
   */
  busiest: number;
  /** Seconds of breath on top of a move that the stretches between patterns never shrink below. */
  breath: number;
}

export const USUAL_YARD: Yard = { pace: 1, moveGap: MOVE_GAP_S, busiest: 1, breath: 0.25 };

/** The running speed at `distance` metres of pace, in this yard. */
export function yardSpeed(yard: Yard, distance: number): number {
  return speedAt(distance) * yard.pace;
}

/** Seconds of running left clear between two stretches at a busyness level, never less than a move and a breath. */
export function stretchGapS(yard: Yard, level: number): number {
  return Math.max(yard.moveGap + yard.breath, 1.4 - 0.5 * level);
}
