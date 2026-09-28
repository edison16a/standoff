/**
 * A small seeded random source (mulberry32). Every roll in a match comes
 * from one of these, so a seed replays the same game exactly. That keeps
 * the tests honest and the showcase identical on every capture.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

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

  chance(p: number): boolean {
    return this.next() < p;
  }

  sign(): 1 | -1 {
    return this.next() < 0.5 ? -1 : 1;
  }

  /** A roughly bell shaped number around zero with the given spread. */
  gauss(spread: number): number {
    return (this.next() + this.next() + this.next() - 1.5) * spread * 1.4;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error("Cannot pick from an empty list.");
    return item;
  }
}
