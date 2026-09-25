import { RULES } from "./rules";

const F = RULES.fatigue;

/**
 * How worn down a boxer is from punishment, 0 fresh to 1 spent. It is
 * apart from stamina, which only punching uses up: a boxer who has just
 * been hurt, or has eaten a run of shots, throws slower and softer for a
 * few seconds even with a full tank.
 */
export class Fatigue {
  level = 0;
  private hits: number[] = [];

  /** A clean hit landed on this boxer. `hurt` is a big one, or one that stunned. */
  onHit(now: number, hurt: boolean): void {
    this.hits = this.hits.filter((at) => now - at < F.streakMs);
    this.hits.push(now);
    let gain = F.perHit;
    if (hurt) gain += F.hurt;
    // Only the hit that makes the streak adds the extra, not every one after it.
    if (this.hits.length === F.streakHits) gain += F.streak;
    this.level = Math.min(1, this.level + gain);
  }

  update(dtMs: number, health: number): void {
    const floor = health < F.lowHealth ? F.lowHealthFloor : 0;
    this.level = Math.max(floor, this.level - (F.drainPerS * dtMs) / 1000);
  }

  /** How much longer a punch takes to land and come back. */
  get slow(): number {
    return 1 + F.slow * this.level;
  }

  /** How much of its damage a punch keeps. */
  get weak(): number {
    return 1 - F.weak * this.level;
  }

  reset(): void {
    this.level = 0;
    this.hits = [];
  }
}
