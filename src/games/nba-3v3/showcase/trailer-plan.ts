/**
 * The home screen trailer, cut by cut. Each cut plays a stretch of one
 * film, in the film's own game seconds, through one camera, with an
 * optional slow motion window that ramps in and out like a speed ramp.
 * The highlight film is the scripted ankle breaker, windmill and gold iso
 * three (script.ts); the chase film is the chase down block lab scene
 * (lab-blocks.ts); the ceremony film is the trophy lift (lab-ceremony.ts).
 */
export type TrailerFilmKind = "highlight" | "chase" | "ceremony";

export type TrailerCam = "ankles" | "rise" | "slam" | "chase" | "swat" | "iso" | "release" | "glass" | "lift" | "crane";

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
 * highlight: the crossover at 0.7 s breaks the Lockdown defender's
 * ankles at 0.83, the Dunker gathers at 1.83, takes off at 2.25 and
 * slams at 2.78. The Playmaker is checked the ball at 9.03, crosses at
 * once, steps back at 9.7 and lets a gold three go at 10.73, and it
 * drops through the net at 12.05. The chase film: the driver gathers at
 * 1.45 with the Lockdown defender on his hip, and the swat lands at
 * 2.18. The ceremony's captain drives the trophy up between 2.3 and 3.3.
 */
export const CUTS: readonly Cut[] = [
  // The last second of the crane, so the capture's cross fade from the end back to the start blends a shot into itself.
  { film: "ceremony", from: CRANE_TO - 1, to: CRANE_TO, cam: "crane" },
  { film: "highlight", from: 0.45, to: 1.6, cam: "ankles", slow: { from: 0.82, to: 1.05, scale: 0.4 } },
  { film: "highlight", from: 1.95, to: 2.45, cam: "rise", slow: { from: 2.2, to: 2.45, scale: 0.3 } },
  { film: "highlight", from: 2.45, to: 3.0, cam: "slam", slow: { from: 2.5, to: 2.8, scale: 0.3 } },
  { film: "chase", from: 1.15, to: 1.95, cam: "chase" },
  { film: "chase", from: 1.95, to: 2.65, cam: "swat", slow: { from: 2.1, to: 2.32, scale: 0.3 } },
  { film: "highlight", from: 9.0, to: 10.2, cam: "iso" },
  { film: "highlight", from: 10.2, to: 11.05, cam: "release" },
  { film: "highlight", from: 11.6, to: 12.25, cam: "glass", slow: { from: 11.9, to: 12.1, scale: 0.4 } },
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
