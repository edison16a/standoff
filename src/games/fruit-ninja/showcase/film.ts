/** Where the camera looks: a point on the board and how close. A zoom of 1 is the whole board. */
export interface Aim {
  x: number;
  y: number;
  zoom: number;
}

/**
 * One cut of the trailer: a stretch of the script, filmed from one aim.
 * Cuts may skip ahead in the script but never back, and one pass of them
 * moves the script on by whole periods, so the clip joins up.
 */
export interface Cut {
  /** Script second the cut opens on, within the first period. */
  from: number;
  /** Real seconds it lasts on screen. */
  seconds: number;
  /** Script seconds per real second. Under 1 is slow motion. */
  rate?: number;
  aim: Aim;
  /** Where the camera has pushed to by the end. */
  to?: Aim;
}

export interface Spot {
  index: number;
  /** The script second on screen, counting every pass before. */
  scriptTime: number;
  aim: Aim;
}

/** Real seconds one pass of the cuts takes. */
export function cycleOf(cuts: readonly Cut[]): number {
  return cuts.reduce((sum, cut) => sum + cut.seconds, 0);
}

/**
 * The script second and aim `elapsed` real seconds into the film. Each
 * pass adds `period` script seconds, so pass two films what pass one did.
 */
export function spotAt(cuts: readonly Cut[], period: number, elapsed: number): Spot {
  const cycle = cycleOf(cuts);
  const pass = Math.floor(elapsed / cycle);
  let t = elapsed - pass * cycle;
  for (let index = 0; index < cuts.length; index++) {
    const cut = cuts[index]!;
    if (t < cut.seconds || index === cuts.length - 1) {
      const local = Math.min(t, cut.seconds);
      const progress = local / cut.seconds;
      return { index, scriptTime: pass * period + cut.from + local * (cut.rate ?? 1), aim: aimAt(cut, progress) };
    }
    t -= cut.seconds;
  }
  throw new Error("a film needs at least one cut");
}

/** The aim partway through a cut, eased so a push starts and lands softly. */
function aimAt(cut: Cut, progress: number): Aim {
  if (!cut.to) return cut.aim;
  const e = progress * progress * (3 - 2 * progress);
  const { aim, to } = cut;
  return { x: aim.x + (to.x - aim.x) * e, y: aim.y + (to.y - aim.y) * e, zoom: aim.zoom + (to.zoom - aim.zoom) * e };
}

/** Whether the script only ever moves forward through the cuts and on into the next pass. */
export function movesForward(cuts: readonly Cut[], period: number): boolean {
  let at = -Infinity;
  for (const cut of [...cuts, { ...cuts[0]!, from: cuts[0]!.from + period }]) {
    if (cut.from < at - 1e-9) return false;
    at = cut.from + cut.seconds * (cut.rate ?? 1);
  }
  return true;
}
