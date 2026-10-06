/**
 * The home screen trailer, cut by cut. Each cut plays a stretch of one
 * film, in the film's own seconds, through one camera, with an optional
 * slow motion window that ramps in and out like a speed ramp. The match
 * film is the seeded game in trailer-films.ts; the ceremony film is the
 * cup lift, its seconds counted from the cut to the ceremony.
 */
export type TrailerFilmKind = "match" | "ceremony";

export type TrailerCam = "hurdle" | "strike" | "net" | "sui" | "lift" | "crane";

export interface SlowWindow {
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
export const CRANE_FROM = 3.1;
export const CRANE_TO = 4.7;

/** Game seconds the speed takes to ramp down into a slow window and back up out of it. */
export const RAMP = 0.12;

/**
 * Timings come from the seeded match: the Striker takes a dropping ball
 * on his chest at 21.25 s, the Winger slides in at 21.72 and the Striker
 * hops over him. He strikes from the edge of the box at 24.12, it is in
 * at 24.5 and bulges the net, and his SUI leaps from 25.98 to 26.6. In
 * the ceremony the captain drives the cup up between 2.1 and 3.1.
 */
export const CUTS: readonly Cut[] = [
  // The last second of the crane, so the capture's cross fade from the end back to the start blends a shot into itself.
  { film: "ceremony", from: CRANE_TO - 1, to: CRANE_TO, cam: "crane" },
  { film: "match", from: 21.52, to: 22.32, cam: "hurdle", slow: { from: 21.78, to: 22.12, scale: 0.3 } },
  { film: "match", from: 23.67, to: 24.27, cam: "strike", slow: { from: 24.06, to: 24.2, scale: 0.3 } },
  { film: "match", from: 24.32, to: 24.75, cam: "net" },
  { film: "match", from: 25.63, to: 26.78, cam: "sui", slow: { from: 25.93, to: 26.53, scale: 0.45 } },
  { film: "ceremony", from: 1.6, to: CRANE_FROM, cam: "lift", slow: { from: 2.2, to: 2.9, scale: 0.65 } },
  { film: "ceremony", from: CRANE_FROM, to: CRANE_TO, cam: "crane" },
];

/** How fast the film runs at second `g` of a cut: 1, or slower inside its window. */
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
