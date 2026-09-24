const RING_MS = 520;
/** Radius the shockwave reaches, in metres. */
const RING_RADIUS = 1.1;

/**
 * The shockwave where a touch lands: a ring thrown out from the contact
 * point that thins and fades as it grows. It fires when the slow motion
 * ends, which is the "big effect" moment of a touch.
 */
export class ImpactRing {
  private rings: { x: number; y: number; born: number }[] = [];

  fire(x: number, y: number, t: number): void {
    this.rings.push({ x, y, born: t });
  }

  draw(ctx: CanvasRenderingContext2D, colour: string, now: number, px: number): void {
    this.rings = this.rings.filter((ring) => now >= ring.born && now - ring.born < RING_MS);
    if (this.rings.length === 0) return;
    ctx.save();
    ctx.strokeStyle = colour;
    for (const ring of this.rings) {
      const k = (now - ring.born) / RING_MS;
      // Fast at first, easing out, like a real blast.
      const grown = 1 - (1 - k) ** 3;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 14 * px * (1 - k) + px;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, RING_RADIUS * grown, 0, Math.PI * 2);
      ctx.stroke();
      // A solid core that flashes and shrinks inside the ring.
      ctx.globalAlpha = Math.max(0, 1 - k * 2.5);
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 0.22 * (1 - k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
