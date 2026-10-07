import { STEP } from "../engine/tuning";
import { CourtRenderer } from "../render/court-renderer";
import type { Film } from "./dev";
import { FILMED_FRAME, FilmClock } from "./film-clock";
import { PosterFilm } from "./film-poster";
import { StepbackFilm } from "./film-stepback";
import { CeremonyFilm } from "./lab-ceremony";
import { CAST, TRAILER_LINEUP } from "./trailer-cast";
import { TrailerCams } from "./trailer-cams";
import { CUTS, rateAt, type Cut, type TrailerFilmKind } from "./trailer-plan";

/** The loop draws a little under full resolution: much quicker to film, and the video's own softening hides it. */
const LOOP_PIXELS = 0.8;
/** The Dunker, who threw down the poster, lifts the trophy. */
const CAPTAIN = CAST.dunker;
/** Before a cut, the players' animation is run this long without drawing, so they are mid stride when it opens. */
const SETTLE = 1.5;

function makeFilm(kind: TrailerFilmKind): Film {
  if (kind === "ceremony") return new CeremonyFilm(TRAILER_LINEUP, CAPTAIN);
  if (kind === "poster") return new PosterFilm();
  return new StepbackFilm();
}

/**
 * Plays the home screen trailer (trailer-plan.ts): each cut a fresh copy
 * of its film, run on without drawing to where the cut opens, then
 * filmed through the cut's camera with its speed ramp. Films nothing
 * until the capture tool's warm up is over, so its first frame is the
 * trailer's first frame.
 */
export class TrailerDirector {
  private readonly renderer: CourtRenderer;
  private readonly clock = new FilmClock(STEP);
  private readonly cams = new TrailerCams();
  private index = -1;
  private cut: Cut = CUTS[0]!;
  private film!: Film;
  /** The film's own seconds, and real seconds into the cut. */
  private g = 0;
  private u = 0;
  private held = false;
  private draws = 0;

  constructor(canvas: HTMLCanvasElement, seek: number | null) {
    this.renderer = new CourtRenderer(canvas, { governed: false });
    this.renderer.cinematic();
    this.enter(0);
    // Development: `?t=seconds` holds the trailer at that moment, for looking at single frames.
    if (seek !== null) {
      for (let t = 0; t < seek; t += FILMED_FRAME) this.advance(FILMED_FRAME, false);
      this.held = true;
    }
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, this.held ? dpr : dpr * LOOP_PIXELS);
    this.draws = 0;
  }

  frame(now: number): void {
    if (this.held) {
      if (this.draws++ < 1) this.show(0, 0, true);
      return;
    }
    const tick = this.clock.tick(now, window.__showcaseReady === true);
    if (tick.filming) this.advance(tick.real, tick.draw);
  }

  /** Moves the trailer on by a slice of real time, cutting when the cut is over, and draws it if asked. */
  private advance(real: number, draw: boolean): void {
    const dt = real * rateAt(this.cut, this.g);
    // Whole engine steps at full speed; in slow motion one smaller step, so every filmed frame moves.
    const n = Math.max(1, Math.ceil(dt / STEP - 1e-6));
    for (let i = 0; i < n; i++) this.step(dt / n);
    this.u += real;
    if (this.g >= this.cut.to - 1e-6) this.enter(this.index + 1);
    this.show(dt, real, draw);
  }

  /** Points the cut's camera, moves the drawing on by `dt` of game time and draws it if asked. */
  private show(dt: number, real: number, draw: boolean): void {
    this.cams.update(this.cut.cam, this.film.match, this.u, this.g, real);
    this.renderer.tv.fixed = this.cams.pose;
    this.renderer.render(dt, draw);
    if (draw) this.renderer.finish();
  }

  private step(dt: number): void {
    const film = this.film;
    this.g += dt;
    film.steer(this.g);
    if (film.stepCeremony) film.stepCeremony(dt);
    else film.match.step(dt);
    for (const e of film.match.drainEvents()) {
      this.renderer.onEvent(e);
      if (e.type === "dunk") this.cams.shake(0.4);
    }
  }

  /** Opens cut `i` (after the last, the trailer starts again): a fresh film, run on to where the cut opens. */
  private enter(i: number): void {
    this.index = i % CUTS.length;
    this.cut = CUTS[this.index]!;
    this.film = makeFilm(this.cut.film);
    this.g = 0;
    this.u = 0;
    this.renderer.setMatch(this.film.match);
    this.renderer.setCeremony(this.film.ceremony ?? null);
    while (this.g < this.cut.from - 1e-6) {
      this.step(Math.min(STEP, this.cut.from - this.g));
      if (this.cut.from - this.g < SETTLE) this.renderer.render(STEP, false);
    }
    this.cams.cut();
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
