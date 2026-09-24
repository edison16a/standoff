const PER_CANNON = 160;
/** Pixels per second squared. */
const GRAVITY = 900;
/** Share of speed kept per second, so pieces float down instead of dropping. */
const DRAG = 0.35;
const LIFE_MS = 6000;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  w: number;
  h: number;
  tone: 0 | 1 | 2;
}

/**
 * A lot of confetti for the winner, fired from both bottom corners of the
 * screen. It lives in screen pixels on the wall clock, so it keeps falling
 * at the same pace whatever the match clock does.
 */
export class Confetti {
  private pieces: Piece[] = [];
  private startedAt = 0;
  private last = 0;

  constructor(private readonly random: () => number = Math.random) {}

  launch(width: number, height: number, now: number): void {
    this.pieces = [];
    this.startedAt = this.last = now;
    for (const side of [-1, 1]) {
      for (let i = 0; i < PER_CANNON; i++) {
        // Up and in toward the middle, spread over a wide fan.
        const angle = ((62 + this.random() * 26) * Math.PI) / 180;
        const speed = height * (1.1 + this.random() * 0.9);
        this.pieces.push({
          x: side < 0 ? 0 : width,
          y: height,
          vx: -side * Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          spin: (this.random() - 0.5) * 18,
          angle: this.random() * Math.PI,
          w: 6 + this.random() * 6,
          h: 10 + this.random() * 8,
          tone: Math.floor(this.random() * 3) as 0 | 1 | 2,
        });
      }
    }
  }

  get active(): boolean {
    return this.pieces.length > 0;
  }

  draw(ctx: CanvasRenderingContext2D, tones: [string, string, string], now: number, height: number): void {
    if (this.pieces.length === 0) return;
    if (now - this.startedAt > LIFE_MS) {
      this.pieces = [];
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const keep = DRAG ** dt;
    const fade = Math.min(1, (LIFE_MS - (now - this.startedAt)) / 800);
    ctx.save();
    ctx.globalAlpha = fade;
    for (const piece of this.pieces) {
      piece.vx *= keep;
      piece.vy = piece.vy * keep + GRAVITY * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += piece.spin * dt;
      if (piece.y > height + 40) continue;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.angle);
      // Squashing one side makes a flat piece look like it tumbles.
      ctx.scale(1, Math.cos(piece.angle * 1.7));
      ctx.fillStyle = tones[piece.tone];
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.restore();
    }
    ctx.restore();
  }
}
