/** How long a point of the trail stays on screen. */
const TRAIL_MS = 280;
/** Width of the newest end of the trail, in screen pixels. */
const HEAD_WIDTH = 6;
const HEAD_ALPHA = 0.85;

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

/**
 * A fading line behind a blade tip, so every jab, parry and sweep of the
 * phone leaves a streak showing exactly where the sword went. Points are
 * kept in metres and stamped with the frame's own clock, so the trail
 * moves with the camera and slows down with a slow motion replay.
 */
export class BladeTrail {
  private points: TrailPoint[] = [];

  add(x: number, y: number, t: number): void {
    const last = this.points.at(-1);
    // Time running backwards means a replay started or a new match began.
    // The old trail belongs to another moment.
    if (last && t < last.t) this.points = [];
    if (last && t === last.t) return;
    this.points.push({ x, y, t });
    while (this.points.length > 0 && t - this.points[0]!.t > TRAIL_MS) this.points.shift();
  }

  /**
   * Draws in whatever space the canvas is in, with `px` the size of one
   * screen pixel in that space. Each segment fades and thins with age, so
   * the line tapers off behind the tip.
   */
  draw(ctx: CanvasRenderingContext2D, colour: string, now: number, px: number): void {
    const points = this.points;
    if (points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = colour;
    // Butt ends, because round ones overlap at every joint and bead the line.
    ctx.lineCap = "butt";
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]!;
      const to = points[i]!;
      const life = 1 - (now - to.t) / TRAIL_MS;
      // Under a pixel long there is nothing to see.
      if (life <= 0 || Math.hypot(to.x - from.x, to.y - from.y) < px) continue;
      ctx.globalAlpha = HEAD_ALPHA * life;
      ctx.lineWidth = HEAD_WIDTH * life * px;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
