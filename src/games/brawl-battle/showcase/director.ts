import type { ShowcaseView } from "@/platform/games/game-api";
import { stepMatch } from "../engine/match";
import { STEP } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import { BrawlRenderer } from "../render/brawl-renderer";
import { isLabCharacter, makeLab, type Lab } from "./lab";
import { LOOP_LEAD, PREROLL, SEED, showcaseMatch, STILL_AT, STILL_CAMERA } from "./script";

/**
 * The tool's fake clock keeps running in real time as well, so a frame
 * that takes the software renderer twenty seconds would race the film
 * ahead. A gap longer than a normal frame is taken as one filmed frame.
 */
const STALL = 0.05;
const FILMED_FRAME = 1 / 30;

/** Drawn at most once per filmed frame: the page's own frames come twice as often. */
const DRAW_EVERY = FILMED_FRAME * 0.9;

/** The loop plays behind the home screen, so it draws a little under full resolution. */
const LOOP_PIXELS = 0.8;

/**
 * Runs the showcase: a seeded match of four bots stepped at the engine's
 * fixed rate from performance.now, drawn by the real renderer. The same
 * seed always plays the same fight, so the film comes out the same.
 */
export class ShowcaseDirector {
  private readonly renderer: BrawlRenderer;
  private readonly match: MatchState;
  private readonly still: boolean;
  private last = -1;
  private carry = 0;
  private drawn = false;
  private sinceReady = 0;
  private sinceDraw = Infinity;
  private readonly lab: Lab | null;

  constructor(canvas: HTMLCanvasElement, readonly view: ShowcaseView) {
    this.renderer = new BrawlRenderer(canvas);
    // Development aids: ?seed= films another fight, ?at=seconds holds a still at another moment,
    // and ?cam=x,y,distance pins the camera.
    const params = new URLSearchParams(window.location.search);
    // ?lab=samurai swaps the fight for the move lab, see lab.ts.
    const labFor = params.get("lab");
    this.lab = isLabCharacter(labFor) ? makeLab(labFor) : null;
    this.match = this.lab?.match ?? showcaseMatch(Number(params.get("seed")) || SEED);
    this.renderer.setMatch(this.match);
    const cam = params.get("cam");
    if (cam) {
      const [x = 0, y = 0, distance = 20] = cam.split(",").map(Number);
      this.renderer.cam.fixed = { x, y, distance };
    }
    const at = Number(params.get("at")) || STILL_AT[view];
    this.still = at > 0;
    const lead = this.still ? at : LOOP_LEAD;
    for (let t = 0; t < lead; t += STEP) this.renderer.render(this.advance(STEP), 1, false);
    const fixed = this.renderer.cam.fixed ?? STILL_CAMERA[view];
    if (this.still && fixed) {
      // The pinned shot cuts straight in, since a still has no time to ease there.
      this.renderer.cam.fixed = fixed;
      this.renderer.cam.update(this.match.stage, [], 0, { snap: true });
    }
    if (this.still) this.exposeFilm();
  }

  /**
   * Development aid for reviewing motion: window.__brawlFilm(seconds)
   * moves a still on by that much and draws it, so a script can take a
   * frame sequence at any rate.
   */
  private exposeFilm(): void {
    const w = window as unknown as Record<string, unknown>;
    w.__brawlLab = this.lab?.marks ?? null;
    w.__brawlFilm = (seconds: number) => {
      for (let t = 0; t + 1e-9 < seconds; t += STEP) this.renderer.render(this.advance(Math.min(STEP, seconds - t)), this.alpha, false);
      this.renderer.render(0, this.alpha);
      this.renderer.finish();
    };
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, this.still ? dpr : dpr * LOOP_PIXELS);
    this.drawn = false;
  }

  frame(now: number): void {
    if (this.still) {
      if (this.drawn) return;
      this.renderer.render(0, this.alpha);
      this.renderer.finish();
      this.drawn = true;
      return;
    }
    const gap = this.last < 0 ? STEP : (now - this.last) / 1000;
    this.last = now;
    const real = gap > STALL ? FILMED_FRAME : gap;
    if (window.__showcaseReady) this.sinceReady += real;
    this.sinceDraw += real;
    const draw = this.sinceReady >= PREROLL && this.sinceDraw >= DRAW_EVERY;
    this.renderer.render(this.advance(real), this.alpha, draw);
    if (draw) {
      this.sinceDraw = 0;
      this.renderer.finish();
    }
  }

  private get alpha(): number {
    return Math.min(1, this.carry / STEP);
  }

  /** Steps the match by a slice of real time and returns the time that passed. */
  private advance(dt: number): number {
    this.carry += dt;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      this.renderer.beforeStep();
      stepMatch(this.match, this.lab ? new Map([[0, this.lab.command(this.match)]]) : undefined);
      this.renderer.afterStep();
    }
    return dt;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
