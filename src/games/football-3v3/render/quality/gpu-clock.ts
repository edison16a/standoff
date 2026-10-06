interface TimerQuery {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

/**
 * Times the graphics card's own work a few frames behind, through WebGL
 * 2's timer query extension (desktop Chrome has it). Without it, `ready`
 * is false and nothing is measured.
 */
export class GpuClock {
  private readonly ext: TimerQuery | null;
  private readonly waiting: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;

  constructor(private readonly gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.ext = "createQuery" in gl ? (gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerQuery | null) : null;
  }

  get ready(): boolean {
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
      // A disjoint frame's time means nothing (the card was switched or throttled), so it is dropped.
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
