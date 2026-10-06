import type * as THREE from "three";

/**
 * Keeps each frame inside 60 frames a second on whatever graphics card
 * draws it. Where the browser can time the card's own work (WebGL 2's
 * timer queries, on desktop Chrome) every frame is measured; when frames
 * run long the picture draws fewer pixels, and when there is room again
 * it draws more, up to full resolution. Without the timer it leaves the
 * picture alone.
 */

/** Card time a frame may take, in milliseconds: 60 a second with room for everything else. */
export const BUDGET_MS = 12;
const ROOM_MS = 7;
const LEAST = 0.6;
/** Frames between changes, so one slow frame never moves it. */
const SETTLE = 40;

export interface Budget {
  /** The share of full resolution drawn, from 0.6 to 1. */
  scale: number;
  /** Smoothed card time per frame, or null before any is known. */
  ms: number | null;
  since: number;
}

export const budget = (): Budget => ({ scale: 1, ms: null, since: 0 });

/** Takes one frame's card time; returns whether the scale changed. */
export function measure(b: Budget, ms: number): boolean {
  b.ms = b.ms === null ? ms : b.ms + (ms - b.ms) * 0.05;
  b.since++;
  if (b.since < SETTLE) return false;
  if (b.ms > BUDGET_MS && b.scale > LEAST) {
    // Card time grows with pixels, which grow with the square of the scale.
    b.scale = Math.max(LEAST, b.scale * Math.max(0.8, Math.sqrt(BUDGET_MS / b.ms)));
  } else if (b.ms < ROOM_MS && b.scale < 1) {
    b.scale = Math.min(1, b.scale * 1.08);
  } else return false;
  b.since = 0;
  return true;
}

interface TimerQuery {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

/** Times the card's work a few frames behind, through the timer query extension. */
export class GpuClock {
  private readonly ext: TimerQuery | null;
  private readonly waiting: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;

  constructor(private readonly gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.ext = "createQuery" in gl ? (gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerQuery | null) : null;
  }

  begin(): void {
    const gl = this.gl as WebGL2RenderingContext;
    if (!this.ext || this.active || this.waiting.length > 4) return;
    this.active = gl.createQuery();
    if (this.active) gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.active);
  }

  end(): void {
    const gl = this.gl as WebGL2RenderingContext;
    if (!this.ext || !this.active) return;
    gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.waiting.push(this.active);
    this.active = null;
  }

  /** Milliseconds for each frame whose timing has come back since the last call. */
  collect(): number[] {
    const gl = this.gl as WebGL2RenderingContext;
    const out: number[] = [];
    if (!this.ext) return out;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT) as boolean;
    while (this.waiting.length && gl.getQueryParameter(this.waiting[0]!, gl.QUERY_RESULT_AVAILABLE)) {
      const q = this.waiting.shift()!;
      // A disjoint frame's time is meaningless (the card was switched or throttled), so it is dropped.
      if (!disjoint) out.push((gl.getQueryParameter(q, gl.QUERY_RESULT) as number) / 1e6);
      gl.deleteQuery(q);
    }
    return out;
  }

  dispose(): void {
    const gl = this.gl as WebGL2RenderingContext;
    for (const q of this.waiting) gl.deleteQuery(q);
    this.waiting.length = 0;
  }
}

/**
 * The renderer's size under the budget: the page's own size, drawn at up
 * to `most` device pixels per page pixel, less whatever the budget has
 * taken off to keep frames inside 60 a second.
 */
export class PixelBudget {
  private readonly clock: GpuClock;
  private readonly budget = budget();
  private size = { width: 1, height: 1, ratio: 1 };

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.clock = new GpuClock(renderer.getContext());
  }

  /** `ratio` is the most pixels per page pixel the picture should ever draw. */
  resize(width: number, height: number, ratio: number): void {
    this.size = { width: Math.max(1, width), height: Math.max(1, height), ratio };
    this.fit();
  }

  /** Draws through `render`, timing the card's work, and resizes once the budget says so. */
  draw(render: () => void): void {
    this.clock.begin();
    render();
    this.clock.end();
    for (const ms of this.clock.collect()) if (measure(this.budget, ms)) this.fit();
  }

  private fit(): void {
    this.renderer.setPixelRatio(this.size.ratio * this.budget.scale);
    this.renderer.setSize(this.size.width, this.size.height, false);
  }

  dispose(): void {
    this.clock.dispose();
  }
}
