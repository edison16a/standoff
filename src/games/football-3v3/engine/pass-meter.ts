import { clamp } from "./vec";

/**
 * The throw meter. Holding the throw starts a marker that climbs the bar
 * and falls back again, over and over, so a QB can take his time to find
 * a receiver. Letting go in the green throws a good pass; in the thin
 * gold band at its heart, far harder to hit, a perfect one. Below the
 * green the ball comes out weak and floats; above it, hot and hard to
 * hold. The phone draws the same bar on its own clock and sends how long
 * it was held, so the grade is what the player saw.
 */
export const METER = {
  /** Milliseconds for the marker to climb from the bottom to the top. */
  sweepMs: 1000,
  /** Where the green and gold are centred, 0 bottom to 1 top. */
  center: 0.8,
  /** Half the green band, plus a little for each point of arm. */
  greenBase: 0.055,
  greenPerArm: 0.004,
  /** Half the gold band: a few hundredths, a window of under thirty milliseconds. */
  gold: 0.014,
  /** How far past the green a miss is as bad as it gets. */
  worst: 0.35,
} as const;

export type PassGrade = "perfect" | "good" | "weak" | "hot";

/** The bands on the bar for a QB's arm, as half widths around the centre. */
export interface MeterWindow {
  center: number;
  green: number;
  gold: number;
}

export function meterWindow(arm: number): MeterWindow {
  return { center: METER.center, green: METER.greenBase + clamp(arm, 1, 10) * METER.greenPerArm, gold: METER.gold };
}

/** Where the marker is after the throw has been held this long: up, then back down, and round again. */
export function meterLevel(heldMs: number): number {
  const u = Math.max(0, heldMs) / METER.sweepMs;
  const k = u % 2;
  return k <= 1 ? k : 2 - k;
}

export interface ThrowReading {
  grade: PassGrade;
  /** Where the marker stopped, 0 to 1. */
  level: number;
  /** How far outside the green, 0 inside it to 1 as bad as it gets. */
  miss: number;
}

/** Grades a marker stopped at `level`. */
export function gradeLevel(level: number, window: MeterWindow): ThrowReading {
  const off = level - window.center;
  if (Math.abs(off) <= window.gold) return { grade: "perfect", level, miss: 0 };
  if (Math.abs(off) <= window.green) return { grade: "good", level, miss: 0 };
  const miss = clamp((Math.abs(off) - window.green) / METER.worst, 0, 1);
  return { grade: off < 0 ? "weak" : "hot", level, miss };
}

/** Grades a throw held for `heldMs` by a QB with this arm. */
export function gradeThrow(heldMs: number, arm: number): ThrowReading {
  return gradeLevel(meterLevel(heldMs), meterWindow(arm));
}

/**
 * What the timing does to the pass. Each is a factor on the throw as it
 * was before the meter: `line` and `wobble` scale the hand's error and
 * the spiral's wobble (accuracy), `time` the hang time (velocity: below
 * one is a firmer ball), `drop` the chance the hands let it go
 * (catchability), `pick` a defender's odds of catching or swatting it
 * and `read` how far a defender reads and jumps it (interception risk).
 */
export interface PassQuality {
  grade: PassGrade | null;
  line: number;
  wobble: number;
  time: number;
  drop: number;
  pick: number;
  read: number;
}

/** A throw with no meter, such as the pitch: exactly the physics as it always was. */
export const PLAIN: PassQuality = { grade: null, line: 1, wobble: 1, time: 1, drop: 1, pick: 1, read: 1 };

export function passQuality(r: Pick<ThrowReading, "grade" | "miss">): PassQuality {
  const m = r.miss;
  switch (r.grade) {
    // A dime: on the line, a tight spiral, a firm ball, into hands that rarely drop it and past defenders who cannot read it.
    case "perfect":
      return { grade: "perfect", line: 0.15, wobble: 0.5, time: 0.92, drop: 0.2, pick: 0.25, read: 0 };
    case "good":
      return { grade: "good", line: 0.6, wobble: 0.8, time: 0.97, drop: 0.7, pick: 0.8, read: 0.8 };
    // Short of the green: a weak, wobbly floater that hangs for the defence.
    case "weak":
      return { grade: "weak", line: 1.5 + 1.5 * m, wobble: 1.4 + 0.8 * m, time: 1.12 + 0.3 * m, drop: 1, pick: 1.35 + 0.6 * m, read: 1.25 + 0.35 * m };
    // Past it: a fastball off line that is hard to hold.
    case "hot":
      return { grade: "hot", line: 1.4 + 1.4 * m, wobble: 1.1, time: 0.88 - 0.08 * m, drop: 1.5 + 1.5 * m, pick: 1.1 + 0.3 * m, read: 1 };
  }
}

/** Catch odds after the timing: a drop is that much more or less likely. */
export function holdChance(p: number, q: PassQuality): number {
  return clamp(1 - (1 - p) * q.drop, 0.02, 0.998);
}
