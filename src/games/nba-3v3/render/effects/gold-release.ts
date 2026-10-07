import type { Match } from "../../engine/match";
import type { Particles } from "./particles";

const GOLD = ["#ffd23f", "#ffb703", "#fff1a8"] as const;

/**
 * The big screen's gold release: a ring of gold sparks off the hands as
 * the ball leaves them, then a thin gold trail behind the ball all the
 * way down through the net. The green gets nothing like it, so the room
 * can tell the rare one apart at a glance.
 */
export class GoldRelease {
  constructor(
    private readonly glow: Particles,
    private readonly rng: () => number,
  ) {}

  /** The burst at the release point, where the ball is now. */
  release(m: Match): void {
    const b = m.ball.pos;
    this.glow.burst({ x: b.x, y: b.y, z: b.z, count: 46, colour: GOLD[0], speed: [1.2, 3.4], up: 0.35, life: [0.35, 0.7], size: [0.06, 0.13], gravity: 1.5, drag: 0.12 }, this.rng);
    this.glow.burst({ x: b.x, y: b.y, z: b.z, count: 18, colour: GOLD[2], speed: [0.3, 1], life: [0.25, 0.45], size: [0.12, 0.22], gravity: 0, drag: 0.2 }, this.rng);
  }

  /** A few sparks a frame behind a gold ball still in the air. */
  frame(m: Match): void {
    const b = m.ball;
    if (b.mode !== "flight" || b.shot?.grade !== "gold" || b.shot.counted) return;
    const colour = GOLD[Math.floor(this.rng() * GOLD.length)]!;
    this.glow.burst({ x: b.pos.x, y: b.pos.y, z: b.pos.z, count: 3, colour, speed: [0.1, 0.5], life: [0.3, 0.55], size: [0.06, 0.12], gravity: 0.6, drag: 0.4 }, this.rng);
  }
}
