import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { STEP } from "../engine/tuning";
import { CourtRenderer } from "../render/court-renderer";
import { BotFilm } from "./bot-film";
import { HighlightScript } from "./script";

/** Where the highlight starts for each view, in seconds of the script. */
const LEAD: Record<ShowcaseView, number> = { loop: -0.4, poster: 0.85, icon: 0.85 };

/**
 * The poster and the icon are single frames, so the film is run this far
 * ahead without drawing and then held: Giannis rising for the hammer.
 */
const STILL_AT: Record<ShowcaseView, number> = { loop: 0, poster: 2.84, icon: 2.86 };

/**
 * The capture tool lets the scene run three seconds after the page says
 * it is ready, then films. Nobody sees those frames, so the loop steps
 * through them without drawing, which saves a long wait on a computer
 * that renders in software.
 */
const PREROLL = 2.95;

/**
 * The tool's fake clock keeps running in real time as well, so a frame
 * that takes the software renderer twenty seconds would race the film
 * ahead. A gap longer than a normal frame is taken as one filmed frame.
 */
const STALL = 0.05;
const FILMED_FRAME = 1 / 30;

/** Drawn at most once per filmed frame: the page's own frames come twice as often. */
const DRAW_EVERY = FILMED_FRAME * 0.9;

/**
 * The loop plays behind the home screen, so it draws a little under full
 * resolution: much quicker to film, and the video's own softening hides it.
 */
const LOOP_PIXELS = 0.8;

/** A held still is drawn once, and again after a resize, so the capture waits on as little as possible. */
const STILL_DRAWS = 1;

/** The stills' hero angles: low on the floor by the lane, looking up at the dunk. */
const STILL_CAMERA: Partial<Record<ShowcaseView, { pos: THREE.Vector3; look: THREE.Vector3; fov: number }>> = {
  poster: { pos: new THREE.Vector3(2.9, 1.2, 5.9), look: new THREE.Vector3(-0.4, 2.25, 1.9), fov: 46 },
  icon: { pos: new THREE.Vector3(1.3, 0.9, 3.7), look: new THREE.Vector3(-0.25, 2.4, 1.9), fov: 56 },
};

/**
 * Runs the showcase: the scripted highlight stepped at the engine's
 * fixed rate from performance.now, slowed for the dunk, and drawn by
 * the real renderer through the broadcast camera.
 */
export class ShowcaseDirector {
  private readonly renderer: CourtRenderer;
  private readonly script: HighlightScript | BotFilm;
  private readonly still: boolean;
  private last = -1;
  private carry = 0;
  private elapsed = 0;
  private slowLeft = 0;
  private slowScale = 1;
  private draws = 0;
  private sinceReady = 0;
  private sinceDraw = Infinity;

  constructor(canvas: HTMLCanvasElement, readonly view: ShowcaseView) {
    this.renderer = new CourtRenderer(canvas);
    // Development aids: ?cam=x,y,z,lookX,lookY,lookZ,fov pins the camera for close looks at the models,
    // ?at=seconds holds a still at another moment of the film, and ?bots=seed films a computer game instead.
    const params = new URLSearchParams(window.location.search);
    const bots = params.get("bots");
    this.script = bots === null ? new HighlightScript(LEAD[view]) : new BotFilm(Number(bots) || 1);
    this.renderer.setMatch(this.script.match);
    this.renderer.tv.fixed = bots === null ? (STILL_CAMERA[view] ?? null) : null;
    const cam = params.get("cam");
    if (cam) {
      const [x = 0, y = 0, z = 0, lx = 0, ly = 0, lz = 0, fov = 40] = cam.split(",").map(Number);
      this.renderer.tv.fixed = { pos: new THREE.Vector3(x, y, z), look: new THREE.Vector3(lx, ly, lz), fov };
    }
    const at = Number(params.get("at")) || STILL_AT[view];
    this.still = at > 0;
    for (let t = 0; t < at; t += STEP) this.renderer.render(this.advance(STEP), false);
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, this.still ? dpr : dpr * LOOP_PIXELS);
    this.draws = 0;
  }

  frame(now: number): void {
    if (this.still) {
      if (this.draws++ < STILL_DRAWS) {
        this.renderer.render(0);
        this.renderer.finish();
      }
      return;
    }
    const gap = this.last < 0 ? STEP : (now - this.last) / 1000;
    this.last = now;
    const real = gap > STALL ? FILMED_FRAME : gap;
    if (window.__showcaseReady) this.sinceReady += real;
    this.sinceDraw += real;
    const draw = this.sinceReady >= PREROLL && this.sinceDraw >= DRAW_EVERY;
    this.renderer.render(this.advance(real), draw);
    if (draw) {
      this.sinceDraw = 0;
      this.renderer.finish();
    }
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
      m.step(STEP);
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
