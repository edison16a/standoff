import type { AthleteDetail } from "./materials/athlete-materials";

/** Rendering features that can be turned off for weak graphics hardware. */
export interface Quality {
  antialias?: boolean;
  shadows?: boolean;
  /** Glossy reflections of the arena on the floor, the ball and the rim. */
  reflections?: boolean;
  /** The most device pixels drawn per CSS pixel. */
  maxPixelRatio?: number;
  /** How finely the players are built and dressed. */
  athletes?: AthleteDetail;
}

/** For computers that draw WebGL in software: a smaller picture without antialiasing or shadows, and lighter players. */
export const LOW_QUALITY: Quality = { antialias: false, shadows: false, maxPixelRatio: 0.6, athletes: "low" };
