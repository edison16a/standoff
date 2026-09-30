/**
 * The home screen's trailer for Paintball Battle, cut from round four of
 * the showcase's seeded fight (seed 7). The fight runs on without ever
 * going back: each shot picks it up at its own moment, a cut may skip
 * ahead, and slow motion plays it at half speed, one engine step to each
 * filmed frame, so no frame is ever held.
 */
export type Lens = "run" | "rise" | "fall" | "blast" | "win";

/** A shot is seen over a fighter's shoulder, as the players see the game, or through one of the film's own lenses. */
export type ShotCamera = { kind: "shoulder"; fighter: number } | { kind: "lens"; lens: Lens };

export interface Shot {
  /** Battle seconds the shot covers. */
  from: number;
  to: number;
  /** Real time or half speed. */
  rate: 1 | 0.5;
  camera: ShotCamera;
}

const NOVA = 0;
const BLAZE = 1;
const shoulder = (fighter: number): ShotCamera => ({ kind: "shoulder", fighter });
const lens = (name: Lens): ShotCamera => ({ kind: "lens", lens: name });

/**
 * Blaze sprints up the flank with paint cracking off him. Nova rises from
 * his bunker and, over his shoulder, paints Kite's mask from the far end;
 * Kite goes down in slow motion. Then Blaze's own view as he charges Vex
 * through a spray of paint, the shotgun blast that ends it, and the win.
 */
export const SHOTS: readonly Shot[] = [
  { from: 80.3, to: 81.7, rate: 1, camera: lens("run") },
  { from: 81.9, to: 82.9, rate: 1, camera: lens("rise") },
  { from: 83.2, to: 84.0, rate: 1, camera: shoulder(NOVA) },
  { from: 84.0, to: 84.3, rate: 0.5, camera: shoulder(NOVA) },
  { from: 84.3, to: 84.8, rate: 0.5, camera: lens("fall") },
  { from: 86.6, to: 88.0, rate: 1, camera: shoulder(BLAZE) },
  { from: 89.1, to: 89.7, rate: 0.5, camera: lens("blast") },
  { from: 89.7, to: 91.3, rate: 1, camera: lens("win") },
];

export const shotLength = (s: Shot): number => (s.to - s.from) / s.rate;

/** Seconds of film: the capture's eight second clip and the second it blends back over the start. */
export const FILM_LENGTH = SHOTS.reduce((sum, s) => sum + shotLength(s), 0);

export interface FilmSpot {
  shot: Shot;
  index: number;
  /** How far through the shot, 0 to 1. */
  u: number;
  /** The battle time on screen. */
  time: number;
}

/** What the film shows `t` seconds in; before the start it waits on the first frame, after the end on the last. */
export function filmAt(t: number): FilmSpot {
  let left = Math.max(0, t);
  for (const [index, shot] of SHOTS.entries()) {
    const span = shotLength(shot);
    if (left < span || index === SHOTS.length - 1) {
      const u = Math.min(1, left / span);
      return { shot, index, u, time: shot.from + (shot.to - shot.from) * u };
    }
    left -= span;
  }
  throw new Error("the film has no shots");
}
