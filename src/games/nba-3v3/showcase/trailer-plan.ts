/**
 * The home screen trailer, cut by cut. Each cut plays a stretch of one
 * film, in the film's own game seconds, through one camera, with an
 * optional slow motion window that ramps in and out like a speed ramp.
 * The poster film is the drive, the lob and the poster dunk
 * (film-poster.ts); the stepback film is the Shooter's stepback and gold
 * three over two leaping defenders (film-stepback.ts); the ceremony film
 * is the trophy lift (lab-ceremony.ts).
 */
export type TrailerFilmKind = "poster" | "stepback" | "ceremony";

export type TrailerCam = "drive" | "lob" | "poster" | "floor" | "jab" | "leap" | "pov" | "lift" | "crane";

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
 * Timings come from the films, stepped as the trailer steps them. The
 * poster film: the Big Man leaves his feet at 1.4, the lob goes up at
 * 1.48 and is caught at 1.9, the Dunker takes off at 2.28 and slams at
 * 2.75, and the Big Man is down on the floor from 3.05. The stepback
 * film: the stepback goes at 0.83, the Shooter rises at 1.13, both
 * defenders are up and the gold three leaves his hand at 1.58, and it
 * drops through the net at 2.92. The ceremony's captain drives the
 * trophy up between 2.3 and 3.3.
 */
export const CUTS: readonly Cut[] = [
  // The last second of the crane, so the capture's cross fade from the end back to the start blends a shot into itself.
  { film: "ceremony", from: CRANE_TO - 1, to: CRANE_TO, cam: "crane" },
  { film: "poster", from: 0.32, to: 1.44, cam: "drive" },
  { film: "poster", from: 1.44, to: 1.99, cam: "lob", slow: { from: 1.52, to: 1.84, scale: 0.4 } },
  { film: "poster", from: 1.99, to: 2.84, cam: "poster", slow: { from: 2.64, to: 2.82, scale: 0.25 } },
  { film: "poster", from: 2.84, to: 3.34, cam: "floor", slow: { from: 2.88, to: 3.18, scale: 0.35 } },
  { film: "stepback", from: 0.35, to: 1.13, cam: "jab" },
  { film: "stepback", from: 1.13, to: 1.72, cam: "leap", slow: { from: 1.5, to: 1.7, scale: 0.35 } },
  { film: "stepback", from: 1.72, to: 3.02, cam: "pov", slow: { from: 2.72, to: 3.0, scale: 0.35 } },
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
