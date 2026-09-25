import type { Hit, Hitbox } from "./types";

/**
 * Short hand for the move tables: one hitbox per line reads like a frame
 * data sheet. `hit` is shared by every box in a list.
 */
export function box(x: number, y: number, r: number, from: number, to: number, hit: Hit, group?: number): Hitbox {
  return group === undefined ? { x, y, r, from, to, ...hit } : { x, y, r, from, to, ...hit, group };
}

export function hit(damage: number, base: number, growth: number, angle: number): Hit {
  return { damage, base, growth, angle };
}

/** The same box on both sides of the fighter, for spins and sweeps. */
export function both(x: number, y: number, r: number, from: number, to: number, h: Hit, group?: number): Hitbox[] {
  return [box(x, y, r, from, to, h, group), box(-x, y, r, from, to, h, group)];
}

/** A run of small hits in separate groups, each able to land once, for a flurry. */
export function flurry(count: number, first: number, every: number, length: number, spots: [number, number, number][], h: Hit): Hitbox[] {
  const out: Hitbox[] = [];
  for (let i = 0; i < count; i++) {
    const from = first + i * every;
    for (const [x, y, r] of spots) out.push(box(x, y, r, from, from + length - 1, h, i));
  }
  return out;
}
