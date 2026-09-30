/**
 * The capture tool lets the scene run three seconds after the page says
 * it is ready, then films. Nobody sees those frames, so a film steps
 * through them without drawing, which saves a long wait on a computer
 * that renders in software.
 */
export const PREROLL = 2.95;

/**
 * The tool's fake clock keeps running in real time as well, so a frame
 * that takes the software renderer twenty seconds would race the film
 * ahead. A gap longer than a normal frame is taken as one filmed frame.
 */
const STALL = 0.05;
export const FILMED_FRAME = 1 / 30;

/** Drawn at most once per filmed frame: the page's own frames come twice as often. */
const DRAW_EVERY = FILMED_FRAME * 0.9;

/** One tick of the film: how much real time passed, and whether to draw it. */
export interface Tick {
  real: number;
  draw: boolean;
  /** The capture tool's warm up is over and every frame from here on may be filmed. */
  filming: boolean;
}

/**
 * Turns the page's clock into the film's: seconds since the last frame,
 * and whether this frame is one the capture tool will film.
 */
export class FilmClock {
  private last = -1;
  private sinceReady = 0;
  private sinceDraw = Infinity;

  constructor(private readonly firstStep: number) {}

  tick(now: number, ready: boolean): Tick {
    const gap = this.last < 0 ? this.firstStep : (now - this.last) / 1000;
    this.last = now;
    const real = gap > STALL ? FILMED_FRAME : gap;
    if (ready) this.sinceReady += real;
    this.sinceDraw += real;
    const filming = this.sinceReady >= PREROLL;
    const draw = filming && this.sinceDraw >= DRAW_EVERY;
    if (draw) this.sinceDraw = 0;
    return { real, draw, filming };
  }
}
