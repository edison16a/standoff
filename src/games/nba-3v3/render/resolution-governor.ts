import type * as THREE from "three";

/**
 * Keeps each frame inside its budget on whatever graphics card it runs
 * on. Where the browser can time the card's own work (the timer query
 * extension, on Chrome for the desktop) it measures every frame, and
 * when frames run long it draws fewer pixels; once there is room again
 * it draws more, up to the screen's own resolution. Where the card
 * cannot be timed it leaves the picture alone.
 */

/** Milliseconds of card time a frame may take: 60 frames a second with room to spare. */
export const BUDGET_MS = 12.5;
const LOW_MS = 7.5;
const MIN_SCALE = 0.55;
/** Frames measured between changes, so one slow frame never moves it. */
const SETTLE = 45;

export interface Governor {
  /** The share of the most pixels allowed to draw, 0.55 to 1. */
  scale: number;
  /** Smoothed card time per frame, ms, or null before any is known. */
  gpuMs: number | null;
  /** Frames measured since the last change. */
  since: number;
  /** Set once, when even the fewest pixels run over budget: the costly extras should go. */
  shed: boolean;
}

export function governor(): Governor {
  return { scale: 1, gpuMs: null, since: 0, shed: false };
}

/** Takes one frame's measured card time and returns whether the scale changed. */
export function measure(g: Governor, ms: number): boolean {
  g.gpuMs = g.gpuMs === null ? ms : g.gpuMs + (ms - g.gpuMs) * 0.12;
  g.since++;
  if (g.since < SETTLE) return false;
  if (g.gpuMs > BUDGET_MS && g.scale > MIN_SCALE) {
    // Card time grows with the pixels drawn, so step down in proportion to the overrun.
    g.scale = Math.max(MIN_SCALE, g.scale * Math.max(0.75, Math.sqrt(BUDGET_MS / g.gpuMs)));
  } else if (g.gpuMs > BUDGET_MS && !g.shed) {
    // Already at the fewest pixels and still slow: the last resort is to drop the extras (see Picture.onShed).
    g.shed = true;
  } else if (g.gpuMs < LOW_MS && g.scale < 1) {
    g.scale = Math.min(1, g.scale * 1.1);
  } else return false;
  g.since = 0;
  return true;
}

interface TimerExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

/** Times the card's work frame by frame through WebGL 2's timer queries, a few frames behind. */
export class GpuTimer {
  private readonly ext: TimerExt | null;
  private readonly waiting: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;

  constructor(private readonly gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.ext = "createQuery" in gl ? (gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerExt | null) : null;
  }

  get available(): boolean {
    return this.ext !== null;
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
      // A disjoint frame's timing is meaningless (the card was switched or throttled), so it is dropped.
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
 * The renderer's size and resolution under the governor: the page's own
 * size, drawn at up to `maxPixelRatio` device pixels per CSS pixel, less
 * whatever the governor has taken off to keep frames inside budget.
 */
export class PixelBudget {
  private readonly timer: GpuTimer;
  private readonly g = governor();
  private size = { width: 1, height: 1, dpr: 1 };
  /** A new scale waits for the next frame: resizing the canvas clears it, so doing it after a draw would show one blank frame. */
  private pending = false;
  /** Called once if the governor gives up on pixels alone and asks for the extras to go. */
  onShed: (() => void) | null = null;

  /** `governed` false keeps the full resolution and never sheds, for offline filming where time does not matter. */
  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly maxPixelRatio: number, private readonly governed = true) {
    this.timer = new GpuTimer(renderer.getContext());
  }

  resize(width: number, height: number, dpr: number): void {
    this.size = { width: Math.max(1, width), height: Math.max(1, height), dpr };
    this.apply();
  }

  /** Draws through `render`, timing it, and resizes once the governor says so. */
  draw(render: () => void): void {
    if (!this.governed) return render();
    if (this.pending) this.apply();
    this.timer.begin();
    render();
    this.timer.end();
    for (const ms of this.timer.collect()) {
      const shed = this.g.shed;
      if (!measure(this.g, ms)) continue;
      if (this.g.shed && !shed) this.onShed?.();
      else this.pending = true;
    }
  }

  private apply(): void {
    this.pending = false;
    this.renderer.setPixelRatio(Math.min(this.size.dpr, this.maxPixelRatio) * this.g.scale);
    this.renderer.setSize(this.size.width, this.size.height, false);
  }

  dispose(): void {
    this.timer.dispose();
  }
}
