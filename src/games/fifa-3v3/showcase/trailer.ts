import { STEP } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import { buildView, type MatchView } from "../engine/view";
import { blendViews } from "../engine/view-blend";
import type { MatchRenderer } from "../render/match-renderer";
import { TrailerCams } from "./trailer-cams";
import { makeFilm, stepFilm } from "./trailer-films";
import { CUTS, rateAt, type Cut } from "./trailer-plan";

/**
 * The capture tool films after three seconds of warm up. The trailer
 * holds its first frame until then, so the clip opens on its first cut.
 */
const WARMUP = 2.95;
export const FILMED_FRAME = 1 / 30;
/** Before a cut, the players' animation is run this long without drawing, so they are mid stride when it opens. */
const SETTLE = 1.2;

/**
 * Plays the home screen trailer (trailer-plan.ts): each cut a fresh copy
 * of its film, run on without drawing to where the cut opens, then
 * filmed through the cut's camera with its speed ramp. The renderer is
 * handed a clock of its own that slows with the film.
 */
export class Trailer {
  private readonly cams = new TrailerCams();
  private index = -1;
  private cut: Cut = CUTS[0]!;
  private state!: MatchState;
  /** The film's own seconds, real seconds into the cut, and the renderer's clock in milliseconds. */
  private g = 0;
  /** How far the engine has stepped, and the views either side of `g`, blended for the picture. */
  private simG = 0;
  private prev!: MatchView;
  private next!: MatchView;
  private u = 0;
  private clock = 1000;
  private last = -1;
  private sinceReady = 0;
  private sinceDraw = Infinity;
  private held = false;
  private draws = 0;

  constructor(private readonly renderer: MatchRenderer, seek: number | null) {
    this.enter(0);
    // Development: `?t=seconds` holds the trailer that far in, for looking at single frames.
    if (seek !== null) {
      for (let t = 0; t < seek; t += FILMED_FRAME) this.advance(FILMED_FRAME, false);
      this.held = true;
    }
  }

  /** One page frame. A held trailer is drawn once and then left alone. */
  frame(now: number, ready: boolean): void {
    if (this.held) {
      if (this.draws++ < 1) this.advance(0, true);
      return;
    }
    const gap = this.last < 0 ? 0 : Math.min(FILMED_FRAME, (now - this.last) / 1000);
    this.last = now;
    if (ready) this.sinceReady += gap;
    if (this.sinceReady < WARMUP) return;
    // The page's frames come twice as often as filmed ones: draw only once per filmed frame.
    this.sinceDraw += gap;
    const draw = this.sinceDraw >= FILMED_FRAME * 0.9;
    if (draw) this.sinceDraw = 0;
    this.advance(gap, draw);
  }

  /** Drawn again after a resize, for a held trailer. */
  redraw(): void {
    this.draws = 0;
  }

  private advance(real: number, draw: boolean): void {
    if (real > 0) {
      const dt = real * rateAt(this.cut, this.g);
      this.g += dt;
      this.u += real;
      this.clock += dt * 1000;
      while (this.simG < this.g - 1e-9) this.step();
      if (this.g >= this.cut.to - 1e-6) this.enter(this.index + 1);
    }
    this.cams.update(this.cut.cam, this.state, this.u, this.g, real);
    const pose = this.cams.pose;
    this.renderer.director.setFixed(pose.pos, pose.look, pose.fov);
    const view = blendViews(this.prev, this.next, 1 - (this.simG - this.g) / STEP);
    if (draw) this.renderer.draw(view, "fixed", this.clock, undefined, false);
    else this.renderer.update(view, "fixed", this.clock, undefined, false);
  }

  /** One engine step: the views move on, and its events go to the effects. */
  private step(): void {
    const events = stepFilm(this.state);
    this.simG += STEP;
    this.prev = this.next;
    this.next = buildView(this.state);
    for (const e of events) this.renderer.onEvent(e, this.next);
  }

  /** Opens cut `i` (after the last, the trailer starts again): a fresh film, run on to where the cut opens. */
  private enter(i: number): void {
    this.index = i % CUTS.length;
    this.cut = CUTS[this.index]!;
    this.state = makeFilm(this.cut.film);
    this.simG = 0;
    this.next = buildView(this.state);
    while (this.simG < this.cut.from - 1e-9) {
      this.step();
      // The last stretch is drawn to nothing, so the players' poses and the effects are under way when it opens.
      if (this.cut.from - this.simG < SETTLE) {
        this.clock += STEP * 1000;
        this.renderer.update(this.next, "fixed", this.clock, undefined, false);
      }
    }
    this.g = this.cut.from;
    this.u = 0;
    this.cams.cut();
  }
}
