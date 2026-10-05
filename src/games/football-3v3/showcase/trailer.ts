/**
 * The home screen's trailer for Football 3v3, cut from the showcase's
 * seeded game (SHOWCASE_SEED) and its trophy presentation. Each shot plays a
 * stretch of match time at its own speed from its own camera. The film
 * runs round in a circle: its last frame cuts straight into its first,
 * so the clip loops with no seam wherever the capture happens to start.
 */
export type ShotCamera = "qbLow" | "spiral" | "catch" | "juke" | "hit" | "lift";

export interface Shot {
  /** Which recording the shot plays: the game, or the trophy presentation after it. */
  reel: "game" | "trophy";
  /** Match seconds the shot covers. */
  from: number;
  to: number;
  /** Playback speed: 1 is real time, lower is slow motion. */
  rate: number;
  camera: ShotCamera;
}

/**
 * The long touchdown: the QB winds up and lets it go in slow motion, the
 * spiral is chased through the air, the catch, the side step as a
 * tackler dives past. Then a crunching hit on a spin from late in the
 * game, deep in slow motion, and the trophy going up over the captain's
 * head.
 */
export const SHOTS: readonly Shot[] = [
  { reel: "game", from: 4.56, to: 5.08, rate: 0.4, camera: "qbLow" },
  { reel: "game", from: 5.08, to: 5.98, rate: 0.6, camera: "spiral" },
  { reel: "game", from: 5.98, to: 6.43, rate: 0.45, camera: "catch" },
  { reel: "game", from: 9.5, to: 10.4, rate: 0.8, camera: "juke" },
  { reel: "game", from: 87.85, to: 88.48, rate: 0.35, camera: "hit" },
  { reel: "trophy", from: 5.4, to: 6.42, rate: 0.8, camera: "lift" },
];

/** Seconds a shot lasts on screen. */
export const shotLength = (s: Shot): number => (s.to - s.from) / s.rate;

/** Seconds the whole film lasts before it comes round again. */
export const FILM_LENGTH = SHOTS.reduce((sum, s) => sum + shotLength(s), 0);

export interface FilmSpot {
  shot: Shot;
  index: number;
  /** How far through the shot, 0 to 1. */
  u: number;
  /** The match time on screen. */
  time: number;
}

/** What the film shows `t` seconds in, wrapping round after its length. */
export function filmAt(t: number): FilmSpot {
  let left = ((t % FILM_LENGTH) + FILM_LENGTH) % FILM_LENGTH;
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
