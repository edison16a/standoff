import type { Framing } from "../render/view-camera";

/** One cut of the trailer: a moment of a level, filmed from one angle. */
export interface Cut {
  level: string;
  /** Level second the cut opens on. */
  from: number;
  /** Real seconds it lasts on screen. */
  seconds: number;
  /** Level seconds per real second. Under 1 is slow motion. */
  rate?: number;
  /** The camera at the start of the cut. */
  angle: Framing;
  /** Where the camera has pushed to by the end, for a slow dolly in or out. */
  to?: Partial<Framing>;
  /**
   * Holds the cut's own framing through the preroll too. The camera eases
   * up and down, and a still never moves on, so without this it keeps the
   * height of play's framing.
   */
  settle?: boolean;
}

/** Where the trailer is at one moment. */
export interface Place {
  index: number;
  cut: Cut;
  /** 0 at the start of the cut, 1 at its end. */
  progress: number;
  /** The level second on screen. */
  levelTime: number;
}

/** Real seconds one pass of the cuts takes. The clip loops on this. */
export function cycleOf(cuts: readonly Cut[]): number {
  return cuts.reduce((sum, cut) => sum + cut.seconds, 0);
}

/**
 * The cut on screen `elapsed` real seconds in. The trailer repeats, so a
 * clip of exactly one cycle runs straight back into its first frame.
 */
export function placeAt(cuts: readonly Cut[], elapsed: number): Place {
  const cycle = cycleOf(cuts);
  let t = ((elapsed % cycle) + cycle) % cycle;
  for (let index = 0; index < cuts.length; index++) {
    const cut = cuts[index]!;
    if (t < cut.seconds || index === cuts.length - 1) {
      const local = Math.min(t, cut.seconds);
      return { index, cut, progress: local / cut.seconds, levelTime: cut.from + local * (cut.rate ?? 1) };
    }
    t -= cut.seconds;
  }
  throw new Error("a trailer needs at least one cut");
}

/**
 * Whether a cut carries straight on from the one before: same level, and
 * it opens on the level second the last one ended on. Such a cut changes
 * only the speed or the camera, so the run is not restarted.
 */
export function continues(prev: Cut, next: Cut): boolean {
  return prev.level === next.level && Math.abs(prev.from + prev.seconds * (prev.rate ?? 1) - next.from) < 1e-6;
}

/** The camera partway through a cut, eased so a push starts and lands softly. */
export function angleAt(cut: Cut, progress: number): Framing {
  if (!cut.to) return cut.angle;
  const e = progress * progress * (3 - 2 * progress);
  const mix = (a: number | undefined, b: number | undefined, fallback: number) => {
    const from = a ?? fallback;
    return b === undefined ? a : from + (b - from) * e;
  };
  const { angle, to } = cut;
  return {
    height: mix(angle.height, to.height, angle.height)!,
    across: mix(angle.across, to.across, angle.across)!,
    floor: mix(angle.floor, to.floor, angle.floor)!,
    yaw: mix(angle.yaw, to.yaw, 7),
    drop: mix(angle.drop, to.drop, 1.6),
    roll: mix(angle.roll, to.roll, 0),
  };
}
