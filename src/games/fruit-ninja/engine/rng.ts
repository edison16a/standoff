/**
 * A small seeded random source (mulberry32). The engine never calls
 * Math.random, so a test can replay the exact same round from a seed.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** A float from 0 up to but not including 1. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** A whole number from min to max, both included. */
  int(min: number, max: number): number {
    return Math.min(max, Math.floor(this.range(min, max + 1)));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Picks by weight. Items with no weight are never picked. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= weight(item);
      if (roll < 0) return item;
    }
    return items[items.length - 1]!;
  }
}
