/**
 * Decides which detected person is which player. The model returns people
 * in no particular order, so without this two players would trade places
 * whenever the model's order flips.
 *
 * The rule: player one stands on the left of the mirrored picture. Once a
 * player is tracked they keep their slot by staying nearest to where they
 * were heading, so standing close together never swaps anyone. A player
 * who steps out keeps their slot for a moment in case they come back.
 */

export interface SlotOptions {
  /** Player slots to fill, 1 or 2. */
  slots: number;
  /** A slot not seen for this long is free again, in milliseconds. */
  lostMs: number;
  /** How much nearer, in picture widths, a crossed pairing must be before two tracked players swap. */
  swapMargin: number;
  /** How far, in picture widths, a lone person may be from where a player was heading and still be them. */
  reach: number;
}

export const DEFAULT_SLOTS: SlotOptions = { slots: 2, lostMs: 1500, swapMargin: 0.05, reach: 0.3 };

/** Guessing ahead further than this on a stale speed does more harm than good. */
const MAX_AHEAD_MS = 300;
const MAX_SPEED = 1.5;

interface Seen {
  x: number;
  /** Picture widths per millisecond, eased. */
  speed: number;
  time: number;
}

export class SlotAssigner {
  private readonly last: (Seen | null)[];
  private readonly options: SlotOptions;

  constructor(options: Partial<SlotOptions> = {}) {
    this.options = { ...DEFAULT_SLOTS, ...options };
    this.last = Array.from({ length: this.options.slots }, () => null);
  }

  reset(): void {
    this.last.fill(null);
  }

  /** Whether a slot was seen recently enough to keep its player. */
  tracked(slotIndex: number, time: number): boolean {
    const seen = this.last[slotIndex];
    return !!seen && time - seen.time <= this.options.lostMs;
  }

  /**
   * Takes each person's centre across the mirrored picture (0 left, 1
   * right) and returns, for each slot in order, the index of its person
   * or null when that player is not in view.
   */
  assign(centers: readonly number[], time: number): (number | null)[] {
    const picked = this.options.slots === 1 ? this.pickOne(centers, time) : this.pickTwo(centers, time);
    picked.forEach((person, slot) => {
      if (person !== null) this.remember(slot, centers[person]!, time);
    });
    return picked;
  }

  private remember(slot: number, x: number, time: number): void {
    const seen = this.last[slot];
    const dt = seen ? time - seen.time : 0;
    const raw = seen && dt > 0 && dt <= MAX_AHEAD_MS ? (x - seen.x) / dt : 0;
    const limit = MAX_SPEED / 1000;
    const speed = seen ? seen.speed + 0.5 * (Math.max(-limit, Math.min(limit, raw)) - seen.speed) : 0;
    this.last[slot] = { x, speed, time };
  }

  /** Where a tracked player should be now, if they kept going. */
  private expected(slot: number, time: number): number {
    const seen = this.last[slot]!;
    return seen.x + seen.speed * Math.min(MAX_AHEAD_MS, time - seen.time);
  }

  private pickOne(centers: readonly number[], time: number): (number | null)[] {
    if (!centers.length) return [null];
    // A tracked player stays themselves. Otherwise whoever stands nearest the middle spot plays.
    const target = this.tracked(0, time) ? this.expected(0, time) : 0.5;
    return [nearest(centers, target)];
  }

  private pickTwo(centers: readonly number[], time: number): (number | null)[] {
    const order = centers.map((_, i) => i).sort((a, b) => centers[a]! - centers[b]!);
    const tracked = [this.tracked(0, time), this.tracked(1, time)];
    const at = [tracked[0] ? this.expected(0, time) : 0, tracked[1] ? this.expected(1, time) : 0];
    if (order.length >= 2) {
      const [left, right] = [order[0]!, order[order.length - 1]!];
      const [xl, xr] = [centers[left]!, centers[right]!];
      if (tracked[0] && tracked[1]) {
        const keep = Math.abs(xl - at[0]!) + Math.abs(xr - at[1]!);
        const cross = Math.abs(xr - at[0]!) + Math.abs(xl - at[1]!);
        return cross + this.options.swapMargin < keep ? [right, left] : [left, right];
      }
      const known = tracked[0] ? 0 : tracked[1] ? 1 : -1;
      if (known >= 0) {
        // The tracked player takes whoever is nearest them, and the newcomer gets the other slot.
        const mine = nearest([xl, xr], at[known]!) === 0 ? left : right;
        const other = mine === left ? right : left;
        return known === 0 ? [mine, other] : [other, mine];
      }
      return [left, right];
    }
    if (!order.length) return [null, null];
    const x = centers[0]!;
    const near = (slot: number) => tracked[slot] && Math.abs(x - at[slot]!) <= this.options.reach;
    if (near(0) && near(1)) return Math.abs(x - at[0]!) <= Math.abs(x - at[1]!) ? [0, null] : [null, 0];
    if (near(0)) return [0, null];
    if (near(1)) return [null, 0];
    // Someone new with nobody tracked near them takes the free slot, or the one for their side.
    if (tracked[0] && !tracked[1]) return [null, 0];
    if (tracked[1] && !tracked[0]) return [0, null];
    return x < 0.5 ? [0, null] : [null, 0];
  }
}

function nearest(values: readonly number[], target: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (Math.abs(values[i]! - target) < Math.abs(values[best]! - target)) best = i;
  return best;
}
