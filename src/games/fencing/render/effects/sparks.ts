/** Metres per second squared, pulling sparks down as they fly. */
const GRAVITY = 9.8;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  lifeMs: number;
  /** Accent or text colour, so a burst reads on either theme. */
  accent: boolean;
}

export interface SparkBurst {
  count: number;
  /** Top launch speed, m/s. */
  speed: number;
  lifeMs: number;
}

/**
 * Short bright streaks thrown off a point, for a parry's clash of blades
 * and a touch landing. They live in strip metres on the frame clock, so
 * they fly with the camera and slow down with the slow motion.
 */
export class Sparks {
  private sparks: Spark[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  burst(x: number, y: number, t: number, { count, speed, lifeMs }: SparkBurst): void {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2;
      const v = speed * (0.35 + 0.65 * this.random());
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v + speed * 0.25,
        born: t,
        lifeMs: lifeMs * (0.6 + 0.4 * this.random()),
        accent: this.random() < 0.6,
      });
    }
  }

  get count(): number {
    return this.sparks.length;
  }

  /** Draws in strip metres, with `px` one screen pixel in metres. */
  draw(ctx: CanvasRenderingContext2D, colours: { accent: string; text: string }, now: number, px: number): void {
    // A new match restarts the clock, and sparks from the old one go.
    this.sparks = this.sparks.filter((s) => now >= s.born && now - s.born < s.lifeMs);
    if (this.sparks.length === 0) return;
    ctx.save();
    ctx.lineCap = "round";
    for (const spark of this.sparks) {
      const age = (now - spark.born) / 1000;
      const life = 1 - (now - spark.born) / spark.lifeMs;
      const x = spark.x + spark.vx * age;
      const y = spark.y + spark.vy * age - 0.5 * GRAVITY * age * age;
      // Each spark is a streak along its motion, shrinking as it fades.
      const vy = spark.vy - GRAVITY * age;
      const tail = 0.035 * life;
      const speed = Math.hypot(spark.vx, vy) || 1;
      ctx.globalAlpha = life;
      ctx.strokeStyle = spark.accent ? colours.accent : colours.text;
      ctx.lineWidth = 3 * px * (0.4 + 0.6 * life);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - (spark.vx / speed) * tail, y - (vy / speed) * tail);
      ctx.stroke();
    }
    ctx.restore();
  }
}
