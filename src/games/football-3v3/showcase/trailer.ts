/**
 * The home screen's trailer for Football 3v3, cut from the showcase's
 * seeded game (SHOWCASE_SEED) and its trophy presentation. Each shot plays a
 * stretch of match time at its own speed from its own camera. The film
 * runs round in a circle: its last frame cuts straight into its first,
 * so the clip loops with no seam wherever the capture happens to start.
 */
export type ShotCamera = "qbLow" | "spiral" | "catch" | "juke" | "pylon" | "dance" | "hit" | "lift";

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
 * tackler dives past, then the scorer racing over the goal line at the
 * pylon and his dance in the end zone. Then a crunching hit on a juke
 * from later in the game, deep in slow motion, and the trophy going up
 * over the captain's head.
 */
export const SHOTS: readonly Shot[] = [
  { reel: "game", from: 4.23, to: 4.75, rate: 0.5, camera: "qbLow" },
  { reel: "game", from: 4.75, to: 5.53, rate: 0.75, camera: "spiral" },
  { reel: "game", from: 5.53, to: 5.98, rate: 0.5, camera: "catch" },
  { reel: "game", from: 6.5, to: 7.1, rate: 0.75, camera: "juke" },
  { reel: "game", from: 13.1, to: 13.7, rate: 0.5, camera: "pylon" },
  { reel: "game", from: 14.4, to: 15.2, rate: 1, camera: "dance" },
  { reel: "game", from: 56.65, to: 57.2, rate: 0.4, camera: "hit" },
  { reel: "trophy", from: 5.45, to: 6.295, rate: 1, camera: "lift" },
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
