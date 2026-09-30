/**
 * The home screen trailer, cut by cut. Each cut plays a stretch of one
 * film, in the film's own game seconds, through one camera, with an
 * optional slow motion window that ramps in and out like a speed ramp.
 * The highlight film is the scripted crossover, windmill and iso three
 * (script.ts); the ceremony film is the trophy lift (lab-ceremony.ts).
 */
export type TrailerFilmKind = "highlight" | "ceremony";

export type TrailerCam = "ankles" | "rise" | "slam" | "iso" | "release" | "glass" | "lift" | "crane";

export interface SlowWindow {
  /** Game seconds where the film is fully slowed, and how slow. */
  from: number;
  to: number;
  scale: number;
}

export interface Cut {
  film: TrailerFilmKind;
  from: number;
  to: number;
  cam: TrailerCam;
  slow?: SlowWindow;
}

/** The ceremony's seconds the closing crane shot runs between. */
export const CRANE_FROM = 3.3;
export const CRANE_TO = 4.9;

/** Game seconds the speed takes to ramp down into a slow window and back up out of it. */
export const RAMP = 0.12;

/**
 * Timings come from the scripted film: the crossover at 0.7 s drops the
 * Lockdown defender at 1.8, the Dunker takes off at 2.2 and slams at
 * 2.7. The Playmaker is checked the ball at 7.8, crosses, steps back and
 * lets it go at 9.5, and it kisses the glass at 10.7. The ceremony's
 * captain drives the trophy up between 2.3 and 3.3.
 */
export const CUTS: readonly Cut[] = [
  // The last second of the crane, so the capture's cross fade from the end back to the start blends a shot into itself.
  { film: "ceremony", from: CRANE_TO - 1, to: CRANE_TO, cam: "crane" },
  { film: "highlight", from: 0.5, to: 1.75, cam: "ankles" },
  { film: "highlight", from: 2.0, to: 2.45, cam: "rise", slow: { from: 2.2, to: 2.45, scale: 0.3 } },
  { film: "highlight", from: 2.45, to: 3.05, cam: "slam", slow: { from: 2.45, to: 2.75, scale: 0.3 } },
  { film: "highlight", from: 8.0, to: 9.3, cam: "iso" },
  { film: "highlight", from: 9.3, to: 10.15, cam: "release" },
  { film: "highlight", from: 10.3, to: 10.95, cam: "glass", slow: { from: 10.6, to: 10.8, scale: 0.4 } },
  { film: "ceremony", from: 2.0, to: CRANE_FROM, cam: "lift", slow: { from: 2.6, to: 3.1, scale: 0.65 } },
  { film: "ceremony", from: CRANE_FROM, to: CRANE_TO, cam: "crane" },
];

/** How fast the film runs at game second `g` of a cut: 1, or slower inside its window. */
export function rateAt(cut: Cut, g: number): number {
  const w = cut.slow;
  if (!w) return 1;
  if (g >= w.from && g <= w.to) return w.scale;
  const off = g < w.from ? w.from - g : g - w.to;
  if (off >= RAMP) return 1;
  return w.scale + (1 - w.scale) * (off / RAMP);
}

/** Real seconds a cut lasts on screen, stepped as the trailer steps it. */
export function cutLength(cut: Cut, frame: number): number {
  let g = cut.from;
  let real = 0;
  while (g < cut.to) {
    g += frame * rateAt(cut, g);
    real += frame;
  }
  return real;
}

/** The whole trailer's length in real seconds. */
export function trailerLength(frame: number, cuts: readonly Cut[] = CUTS): number {
  return cuts.reduce((sum, c) => sum + cutLength(c, frame), 0);
}
