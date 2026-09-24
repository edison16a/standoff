import { BLADES, spectrum, type BladeId } from "../blades";

interface Point {
  x: number;
  y: number;
  t: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  colour: string;
}

/** Seconds of path kept behind the tip. */
const TRAIL_S = 0.42;
const SAMPLES = 28;

/** A figure of eight, fast in the middle and slow at the turns, like a real swipe. */
function swing(t: number, width: number, height: number): Point {
  return { x: width / 2 + width * 0.38 * Math.sin(t * 2.6), y: height / 2 + height * 0.3 * Math.sin(t * 5.2 + 0.5), t };
}

/**
 * A little looping swipe on the phone that shows a blade style the way
 * the big screen will draw it: the glow, the hot core, the way it moves
 * and what it throws off. Drawn in 2D so it is cheap on any phone.
 */
export class BladePreview {
  private path: Point[] = [];
  private readonly sparks: Spark[] = [];

  constructor(
    private readonly blade: BladeId,
    private readonly colour: string,
  ) {}

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, dt: number): void {
    const look = BLADES[this.blade];
    // The trail is sampled straight from the swing's path, so it stays a smooth curve even when the phone drops frames.
    this.path = Array.from({ length: SAMPLES + 1 }, (_, i) => swing(time - TRAIL_S * (1 - i / SAMPLES), width, height));
    const { x, y } = this.path[SAMPLES]!;

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#3b2211");
    bg.addColorStop(1, "#24130a");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "lighter";
    // Butt ends, because round caps pile up where segments meet and burn the trail to white.
    ctx.lineCap = "butt";
    const points = look.motion === "bolt" ? this.jagged() : this.path;
    const n = points.length;
    const scale = Math.min(width, height) / 90;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < n; i++) {
        const k = i / (n - 1);
        const a = points[i - 1]!;
        const b = points[i]!;
        const flicker = look.motion === "flame" ? 0.75 + Math.random() * 0.5 : 1;
        const glow = look.motion === "spectrum" ? spectrum(1 - k, time) : look.glow;
        const [colour, width0, alpha] = pass === 0 ? [this.colour, 15, 0.14] : pass === 1 ? [glow, 9, 0.5] : [look.core, 3, 0.9];
        ctx.strokeStyle = colour;
        ctx.globalAlpha = alpha * k;
        ctx.lineWidth = width0 * scale * Math.pow(k, 0.7) * flicker;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    this.throwSparks(x, y, time, dt, scale);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.colour;
    ctx.beginPath();
    ctx.arc(x, y, 7 * scale * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 3 * scale * 0.6, 0, Math.PI * 2);
    ctx.fill();
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.min(1, s.life * 2);
      ctx.fillStyle = s.colour;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6 * scale * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /** The lightning path: the real one, knocked sideways a little at random every frame. */
  private jagged(): Point[] {
    return this.path.map((p, i) => (i === this.path.length - 1 ? p : { ...p, x: p.x + (Math.random() - 0.5) * 9, y: p.y + (Math.random() - 0.5) * 9 }));
  }

  private throwSparks(x: number, y: number, time: number, dt: number, scale: number): void {
    const look = BLADES[this.blade];
    const fall = look.motion === "flame" ? (this.blade === "venom" ? 120 : -90) : look.motion === "shimmer" ? 40 : 160;
    if (Math.random() < 0.7) {
      const colour = look.motion === "spectrum" ? spectrum(Math.random(), time) : Math.random() < 0.5 ? look.accent : look.glow;
      this.sparks.push({ x, y, vx: (Math.random() - 0.5) * 80 * scale, vy: (Math.random() - 0.5) * 80 * scale, life: 0.5 + Math.random() * 0.3, colour });
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]!;
      s.life -= dt;
      s.vy += fall * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
  }
}
