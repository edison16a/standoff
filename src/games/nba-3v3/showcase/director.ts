import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { STEP } from "../engine/tuning";
import { CourtRenderer } from "../render/court-renderer";
import { followCamera, readDev, type DevOptions, type Film } from "./dev";
import { FILMED_FRAME, FilmClock } from "./film-clock";
import { stillLights } from "./still-lights";
import { ICON_AT, ICON_CAMERA, IconFilm, iconLook } from "./icon-film";
import { PosterFilm } from "./film-poster";
import { HighlightScript } from "./script";

/**
 * Where the highlight starts for each view, in seconds of the script.
 * The loop's first three seconds are the capture tool's unfilmed warm
 * up, so its film opens just before the crossover. The poster has its
 * own film, the trailer's lob into the poster dunk (film-poster.ts).
 */
const LEAD: Record<ShowcaseView, number> = { loop: -2.7, poster: 0, icon: 0 };

/**
 * The poster and the icon are single frames, so the film is run this far
 * ahead without drawing and then held. The poster is the Dunker at the
 * top of his poster dunk, both hands cocked back over the Big Man; the
 * icon has its own film (icon-film.ts).
 */
const STILL_AT: Record<ShowcaseView, number> = { loop: 0, poster: 2.5, icon: ICON_AT };

/**
 * The loop plays behind the home screen, so it draws a little under full
 * resolution: much quicker to film, and the video's own softening hides it.
 */
const LOOP_PIXELS = 0.8;

/** A held still is drawn once, and again after a resize, so the capture waits on as little as possible. */
const STILL_DRAWS = 1;

/**
 * The poster's hero angle is low under the glass off the right block,
 * looking up past the Big Man at the Dunker rising over him to the ring.
 */
const STILL_CAMERA: Partial<Record<ShowcaseView, { pos: THREE.Vector3; look: THREE.Vector3; fov: number }>> = {
  poster: { pos: new THREE.Vector3(1.8, 0.55, 0.7), look: new THREE.Vector3(-0.3, 2.3, 2.2), fov: 50 },
  icon: ICON_CAMERA,
};

/** Where the poster's spotlights point: the Dunker in the air over the Big Man by the rim. */
const STILL_SUBJECT = new THREE.Vector3(-0.2, 2.3, 2.0);

/**
 * Runs the showcase: the scripted highlight stepped at the engine's
 * fixed rate from performance.now, slowed for the dunk, and drawn by
 * the real renderer through the broadcast camera.
 */
export class ShowcaseDirector {
  private readonly renderer: CourtRenderer;
  private readonly script: Film;
  private readonly dev: DevOptions;
  private readonly still: boolean;
  private readonly clock = new FilmClock(STEP);
  private carry = 0;
  private elapsed = 0;
  private slowLeft = 0;
  private slowScale = 1;
  private draws = 0;

  constructor(canvas: HTMLCanvasElement, readonly view: ShowcaseView) {
    this.renderer = new CourtRenderer(canvas, { governed: false });
    if (view === "poster") this.renderer.cinematic({ lights: stillLights(STILL_SUBJECT), fill: 0.45, key: 0.55, haze: 0.018, boards: true });
    if (view === "icon") this.renderer.cinematic(iconLook());
    // Development aids: ?cam=x,y,z,lookX,lookY,lookZ,fov pins the camera for close looks at the models,
    // ?at=seconds holds a still at another moment of the film, and dev.ts reads the rest.
    const params = new URLSearchParams(window.location.search);
    this.dev = readDev(params);
    this.script = this.dev.film ?? (view === "icon" ? new IconFilm() : view === "poster" ? new PosterFilm() : new HighlightScript(LEAD[view]));
    this.renderer.setMatch(this.script.match);
    this.renderer.tv.fixed = this.dev.film ? null : (STILL_CAMERA[view] ?? null);
    // A film of the ceremony hands the camera to the ceremony's own shots.
    this.renderer.setCeremony(this.script.ceremony ?? null);
    const cam = params.get("cam");
    if (cam) {
      const [x = 0, y = 0, z = 0, lx = 0, ly = 0, lz = 0, fov = 40] = cam.split(",").map(Number);
      this.renderer.tv.fixed = { pos: new THREE.Vector3(x, y, z), look: new THREE.Vector3(lx, ly, lz), fov };
    }
    const at = Number(params.get("at")) || STILL_AT[view];
    this.still = at > 0;
    for (let t = 0; t < at; t += STEP) this.renderer.render(this.advance(STEP), false);
    if (this.dev.step) window.__nbaStep = (frames = 1) => this.stepFrames(frames);
    // Browser checks read the renderer (its players, materials and draw counts) from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __nbaRenderer: this.renderer });
  }

  /** Development only: the film moves on only when asked, one filmed frame at a time. */
  private stepFrames(frames: number): void {
    for (let i = 0; i < frames; i++) this.renderer.render(this.advance(FILMED_FRAME), i === frames - 1);
    this.renderer.finish();
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, this.still ? dpr : dpr * LOOP_PIXELS);
    this.draws = 0;
  }

  frame(now: number): void {
    if (this.dev.step) return;
    if (this.still) {
      if (this.draws++ < STILL_DRAWS) {
        this.renderer.render(0);
        this.renderer.finish();
      }
      return;
    }
    const { real, draw } = this.clock.tick(now, window.__showcaseReady === true);
    this.renderer.render(this.advance(real), draw);
    if (draw) this.renderer.finish();
  }

  /** Steps the film by a slice of real time and returns the game time that passed. */
  private advance(real: number): number {
    const scale = this.slowLeft > 0 ? this.slowScale : 1;
    this.slowLeft = Math.max(0, this.slowLeft - real);
    const dt = real * scale;
    this.carry += dt;
    const m = this.script.match;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      this.elapsed += STEP;
      this.script.steer(this.elapsed);
      if (this.script.stepCeremony) this.script.stepCeremony(STEP);
      else m.step(STEP);
      if (this.dev.follow) followCamera(this.renderer.tv, m, this.dev.follow);
      for (const e of m.drainEvents()) {
        this.renderer.onEvent(e);
        const slow = this.script.slowFor(e);
        if (slow) {
          this.slowScale = slow.scale;
          this.slowLeft = slow.seconds;
        }
      }
    }
    return dt;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
