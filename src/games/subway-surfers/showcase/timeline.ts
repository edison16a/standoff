import type { PowerKind } from "../engine/types";

/** A camera placed from the runner's feet: where it sits, where it looks, and its lens. */
export interface Place {
  at: readonly [number, number, number];
  look: readonly [number, number, number];
  fov: number;
}

/** One cut of the trailer: a moment of a seeded run, filmed from one angle. */
export interface Cut {
  seed: number;
  /** Run second the cut opens on. */
  from: number;
  /** Real seconds it lasts on screen. */
  seconds: number;
  /** Run seconds per real second. Under 1 is slow motion. */
  rate?: number;
  /** What every power up on the course becomes, or null for none. See ShowRun. */
  pickups?: PowerKind | null;
  /** Takes away the coins just ahead of the runner, which would fill a camera placed in front. */
  clearLens?: boolean;
  /** The game's own chase camera, or a camera placed by hand. */
  angle: "chase" | Place;
  /** Where a placed camera has moved to by the end, for a push or a swing round. */
  to?: Place;
}

/** Where the trailer is at one moment. */
export interface Spot {
  index: number;
  cut: Cut;
  /** 0 at the start of the cut, 1 at its end. */
  progress: number;
  /** The run second on screen. */
  runTime: number;
}

/** Real seconds one pass of the cuts takes. The clip loops on this. */
export function cycleOf(cuts: readonly Cut[]): number {
  return cuts.reduce((sum, cut) => sum + cut.seconds, 0);
}

/** The cut on screen `elapsed` real seconds in. The cuts repeat, so a clip of one cycle loops. */
export function spotAt(cuts: readonly Cut[], elapsed: number): Spot {
  const cycle = cycleOf(cuts);
  let t = ((elapsed % cycle) + cycle) % cycle;
  for (let index = 0; index < cuts.length; index++) {
    const cut = cuts[index]!;
    if (t < cut.seconds || index === cuts.length - 1) {
      const local = Math.min(t, cut.seconds);
      return { index, cut, progress: local / cut.seconds, runTime: cut.from + local * (cut.rate ?? 1) };
    }
    t -= cut.seconds;
  }
  throw new Error("a trailer needs at least one cut");
}

/** Whether a cut carries straight on from the one before, changing only the speed or the camera. */
export function continues(prev: Cut, next: Cut): boolean {
  return prev.seed === next.seed && prev.pickups === next.pickups && Math.abs(prev.from + prev.seconds * (prev.rate ?? 1) - next.from) < 1e-6;
}

/** A placed camera partway through its move, eased so it starts and lands softly. */
export function placeAt(cut: Cut, progress: number): Place | null {
  if (cut.angle === "chase") return null;
  const to = cut.to;
  if (!to) return cut.angle;
  const e = progress * progress * (3 - 2 * progress);
  const a = cut.angle;
  const mix = (p: readonly number[], q: readonly number[]) => [0, 1, 2].map((i) => p[i]! + (q[i]! - p[i]!) * e) as [number, number, number];
  return { at: mix(a.at, to.at), look: mix(a.look, to.look), fov: a.fov + (to.fov - a.fov) * e };
}
