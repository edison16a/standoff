import { Block } from "./block";
import { openingCoins, PATTERNS, type PatternEntry } from "./patterns";
import { Rng } from "./rng";
import { MOVE_GAP_S, speedAt, type Lane } from "./tuning";
import { frontAt, type Coin, type Obstacle, type Pickup, type PowerKind } from "./types";

/** The run up before the first obstacle, while the guard gives chase. */
const FIRST_BLOCK = 60;
/** How far ahead the course is always laid, well past what the fog shows. */
export const LAY_AHEAD = 260;
/** Metres into a stretch whose pace sets its spacing. */
const SPEED_AHEAD = 60;

const POWER_WEIGHTS: readonly (readonly [PowerKind, number])[] = [
  ["boots", 24],
  ["magnet", 26],
  ["hoverboard", 20],
  ["double", 20],
  ["jetpack", 12],
];

export interface CourseOptions {
  /** No obstacles at all, for the tutorial. */
  empty?: boolean;
}

/**
 * The endless yard for one run: laid a stretch at a time from a seed, and
 * cleared behind the runner. The same seed always lays the same yard, so
 * two players on one seed face the same trains in the same places.
 */
export class Course {
  readonly obstacles: Obstacle[] = [];
  readonly coins: Coin[] = [];
  readonly pickups: Pickup[] = [];
  /** Obstacles smashed by a hoverboard save, which no longer block. */
  readonly smashed = new Set<number>();
  private readonly rng: Rng;
  private cursor = FIRST_BLOCK;
  private nextId = 1;
  private nextPickup: number;
  private last = "";

  constructor(
    readonly seed: number,
    private readonly options: CourseOptions = {},
  ) {
    this.rng = new Rng(seed);
    this.nextPickup = 160 + this.rng.range(0, 80);
    if (!options.empty) {
      const opening = new Block(speedAt(0), () => 0);
      openingCoins(opening);
      this.commit(opening, 0);
    }
  }

  /** Lays track until `distance` plus the look ahead is covered. */
  ensure(distance: number): void {
    if (this.options.empty) return;
    while (this.cursor < distance + LAY_AHEAD) this.layBlock();
  }

  /** Forgets everything the runner is well past. Moving trains are kept until they have rolled by too. */
  prune(distance: number): void {
    const behind = distance - 40;
    remove(this.obstacles, (o) => Math.max(o.z, frontAt(o, distance)) + o.length < behind);
    remove(this.coins, (c) => c.z < behind);
    remove(this.pickups, (p) => p.z < behind);
  }

  /** Obstacles that could touch a runner at `distance` within the next `ahead` metres. */
  near(distance: number, ahead = 14, into: Obstacle[] = []): Obstacle[] {
    into.length = 0;
    for (const o of this.obstacles) {
      if (this.smashed.has(o.id)) continue;
      const front = frontAt(o, distance);
      // A moving train closes in at its own speed as well as the runner's.
      const reach = ahead * (1 + o.drift);
      if (front - reach < distance && front + o.length > distance - 4) into.push(o);
    }
    return into;
  }

  addCoin(x: number, y: number, z: number): void {
    this.coins.push({ id: this.nextId++, x, y, z });
  }

  private layBlock(): void {
    // Spaced for the pace a little way in, since the runner speeds up while crossing the stretch.
    const speed = speedAt(this.cursor + SPEED_AHEAD);
    const level = Math.min(1, Math.max(0, (this.cursor - 150) / 1600));
    const block = new Block(speed, () => this.rng.int(0, 7));
    if (this.cursor >= this.nextPickup) {
      this.pickupBlock(block);
      this.nextPickup = this.cursor + 300 + this.rng.range(0, 180);
    } else {
      const entry = this.choose(level);
      entry.make(block, this.rng, level);
      this.last = entry.name;
    }
    this.commit(block, this.cursor);
    // The gap before the next stretch shrinks from about 1.4 to 0.9 seconds of running, never under a move and a breath.
    const gap = Math.max(12, speed * Math.max(MOVE_GAP_S + 0.25, 1.4 - 0.5 * level));
    this.cursor += block.end + gap;
  }

  private choose(level: number): PatternEntry {
    const open = PATTERNS.filter((p) => p.from <= this.cursor && p.name !== this.last);
    return this.rng.weighted(open.map((p) => [p, Math.max(0, p.weight(level))] as const));
  }

  private pickupBlock(block: Block): void {
    const lane = this.rng.pick([-1, 0, 1] as const) as Lane;
    const kind = this.cursor < 400 ? "magnet" : this.rng.weighted(POWER_WEIGHTS);
    block.coinLine(lane, 0, block.sec(0.9));
    block.pickup(kind, lane, block.sec(1.1));
    block.reach(block.sec(1.3));
  }

  private commit(block: Block, at: number): void {
    for (const o of block.obstacles) this.obstacles.push({ ...o, id: this.nextId++, z: o.z + at });
    for (const c of block.coins) this.coins.push({ id: this.nextId++, x: c.x, y: c.y, z: c.z + at });
    for (const p of block.pickups) this.pickups.push({ id: this.nextId++, kind: p.kind, lane: p.lane, y: p.y, z: p.z + at });
  }
}

function remove<T>(list: T[], gone: (item: T) => boolean): void {
  let keep = 0;
  for (const item of list) if (!gone(item)) list[keep++] = item;
  list.length = keep;
}
