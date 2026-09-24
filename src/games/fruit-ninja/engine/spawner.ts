import type { Launch } from "./arena";
import type { Body } from "./events";
import { BIG_FRUIT, COMMON_FRUIT, KINDS, RARE_FRUIT, type BodyKind } from "./fruit-kinds";
import type { Rng } from "./rng";
import { FRENZY_S, GRAVITY, HALF_HEIGHT } from "./tuning";

export interface SpawnConfig {
  /** Waves per second compared with normal. */
  rate: number;
  bombChance: number;
  /** Whether big multi hit fruit and rare glowing fruit may come up. */
  specials: boolean;
}

/** The lobby's gentle stream of practice fruit. */
export const PRACTICE: SpawnConfig = { rate: 0.4, bombChance: 0, specials: false };

export interface SpawnContext {
  halfWidth: number;
  /** Seconds since the round started, and seconds left. Practice passes Infinity for what is left. */
  elapsed: number;
  remaining: number;
  players: number;
  bodies: readonly Body[];
}

const BASE_INTERVAL_S = 1.5;

/**
 * Decides what to throw and when. Waves come at a steady beat that
 * quickens as the round goes on and again in the final frenzy, with more
 * fruit for more players so everyone has something to cut.
 */
export class Spawner {
  private timer = 0.5;
  private queue: { delay: number; launch: Launch }[] = [];

  constructor(
    private readonly rng: Rng,
    private readonly config: SpawnConfig,
  ) {}

  step(dt: number, ctx: SpawnContext): Launch[] {
    const out: Launch[] = [];
    this.queue = this.queue.filter((item) => {
      item.delay -= dt;
      if (item.delay > 0) return true;
      out.push(item.launch);
      return false;
    });
    this.timer -= dt;
    if (this.timer <= 0) {
      this.wave(ctx);
      this.timer = this.interval(ctx);
    }
    return out;
  }

  private interval(ctx: SpawnContext): number {
    const progress = Number.isFinite(ctx.remaining) ? ctx.elapsed / Math.max(1, ctx.elapsed + ctx.remaining) : 0;
    const crowd = 1 + 0.22 * (Math.max(1, ctx.players) - 1);
    const frenzy = ctx.remaining <= FRENZY_S ? 0.62 : 1;
    return (BASE_INTERVAL_S * (1.15 - 0.3 * progress) * frenzy) / (this.config.rate * crowd) + this.rng.range(-0.15, 0.15);
  }

  private wave(ctx: SpawnContext): void {
    const { rng } = this;
    const frenzy = ctx.remaining <= FRENZY_S;
    const progress = Number.isFinite(ctx.remaining) ? ctx.elapsed / Math.max(1, ctx.elapsed + ctx.remaining) : 0;
    const most = Math.min(7, 2 + Math.floor(progress * 3) + (frenzy ? 1 : 0) + Math.floor((ctx.players - 1) / 2));
    const count = this.config.specials ? rng.int(1, most) : rng.int(1, 2);
    const kinds: BodyKind[] = [];
    let bombs = 0;
    const bombCap = this.config.bombChance > 0.2 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const bomb = bombs < bombCap && rng.chance(this.config.bombChance);
      if (bomb) bombs += 1;
      kinds.push(bomb ? "bomb" : rng.weighted(COMMON_FRUIT, (id) => KINDS[id].weight));
    }
    const pattern = count >= 3 ? rng.weighted(["scatter", "volley", "fan"] as const, (p) => ({ scatter: 5, volley: 3, fan: 2 })[p]) : "scatter";
    kinds.forEach((kind, i) => this.enqueue(this.throwFor(kind, pattern, i, count, ctx), pattern === "volley" ? i * 0.17 : 0));

    if (!this.config.specials || ctx.remaining < 6) return;
    const onScreen = (ids: readonly string[]) => ctx.bodies.some((body) => ids.includes(body.kind));
    if (ctx.elapsed > 6 && !onScreen(BIG_FRUIT) && rng.chance(0.07)) {
      this.enqueue(this.throwFor(rng.weighted(BIG_FRUIT, (id) => KINDS[id].weight), "big", 0, 1, ctx), 0.3);
    } else if (ctx.elapsed > 4 && !onScreen(RARE_FRUIT) && rng.chance(0.055)) {
      this.enqueue(this.throwFor(rng.weighted(RARE_FRUIT, (id) => KINDS[id].weight), "rare", 0, 1, ctx), 0.2);
    }
  }

  private enqueue(launch: Launch, delay: number): void {
    this.queue.push({ delay, launch });
  }

  /** Aims one throw so it peaks inside the screen and drifts toward the middle. */
  private throwFor(kind: BodyKind, pattern: "scatter" | "volley" | "fan" | "big" | "rare", index: number, count: number, ctx: SpawnContext): Launch {
    const { rng } = this;
    const w = ctx.halfWidth;
    const radius = KINDS[kind].radius;
    const y = -HALF_HEIGHT - radius - 0.3;
    let x = rng.range(-0.8, 0.8) * w;
    let apex = rng.range(0.1, 0.8) * HALF_HEIGHT;
    let apexX = x * 0.35 + rng.range(-0.3, 0.3) * w;
    if (pattern === "volley") {
      const side = index % 2 === 0 ? -1 : 1;
      x = side * rng.range(0.55, 0.85) * w;
      apexX = -side * rng.range(0, 0.4) * w;
    } else if (pattern === "fan") {
      x = rng.range(-0.25, 0.25) * w;
      apexX = x + (count > 1 ? (index / (count - 1) - 0.5) * 1.3 * w : 0);
    } else if (pattern === "big") {
      x = rng.range(-0.4, 0.4) * w;
      apex = rng.range(0.25, 0.45) * HALF_HEIGHT;
      apexX = x * 0.5;
    } else if (pattern === "rare") {
      const side = rng.chance(0.5) ? -1 : 1;
      x = side * rng.range(0.5, 0.8) * w;
      apex = rng.range(0.45, 0.8) * HALF_HEIGHT;
      apexX = -side * rng.range(0.1, 0.4) * w;
    }
    apexX = Math.max(-0.8 * w, Math.min(0.8 * w, apexX));
    const vy = Math.sqrt(2 * GRAVITY * (apex - y));
    const toApex = vy / GRAVITY;
    const spinScale = pattern === "big" ? 0.4 : 1;
    const spin = () => rng.range(0.8, 3.6) * (rng.chance(0.5) ? -1 : 1) * spinScale;
    return { kind, x, y, vx: (apexX - x) / toApex, vy, spin: { x: spin(), y: spin(), z: spin() } };
  }
}
