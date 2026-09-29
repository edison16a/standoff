import type { Rng } from "./rng";
import { HALF_WIDTH, roundCap, type StageSpec } from "./stages";
import type { ZombieKind } from "./zombie-kinds";

/** One zombie to put on the road: what it is, how far ahead and how far off the middle. */
export interface SpawnOrder {
  kind: ZombieKind;
  ahead: number;
  side: number;
  /** Part of a rush behind a big boss. */
  rush?: boolean;
}

/** What the spawner needs to know about the fight right now. */
export interface Field {
  /** Ordinary zombies still standing. */
  standing: number;
  /** How far ahead a standing boss is, or null when none stands. */
  bossAhead: number | null;
}

/** Once the big boss is down, the rest of its runners come this soon, so the fight never stalls. */
const HURRY = 1.2;

/** How many ordinary zombies a stage sends at a team of this size. A few more per gun, never past the stage's cap. */
export function teamCount(spec: StageSpec, players: number): number {
  const wanted = Math.round(spec.count * (1 + 0.25 * Math.max(0, players - 1)));
  return Math.min(wanted, Math.max(spec.count, roundCap(spec.index) - spec.bosses.length));
}

export function teamMaxAlive(spec: StageSpec, players: number): number {
  // More guns, more at once, so a full team always has something to shoot.
  return spec.maxAlive + Math.max(0, players - 1);
}

/** Seconds between spawns for a team. A bigger team gets its bigger share sooner, so its fights do not drag. */
export function teamGap(spec: StageSpec, players: number): number {
  return spec.gap / (1 + 0.3 * Math.max(0, players - 1));
}

/** Runners in each rush behind a big boss, for a team of this size. */
export function teamRush(spec: StageSpec, players: number): number {
  return spec.rush ? Math.round(spec.rush.size * (1 + 0.25 * Math.max(0, players - 1))) : 0;
}

/**
 * Decides who steps out of the fog, and when. The crowd trickles in a few
 * at a time, never more than the stage lets stand at once. A mini boss
 * waits for part of the crowd to come first. A big boss comes alone, and
 * every so often a pack of runners charges in from behind it.
 */
export class Spawner {
  private spawned = 0;
  private bossesOut = 0;
  private spawnIn: number;
  private rushIn: number | null = null;
  private readonly total: number;
  private readonly maxAlive: number;
  private readonly gap: number;
  private readonly rushSize: number;

  constructor(
    private readonly spec: StageSpec,
    players: number,
    private readonly rng: Rng,
    firstSpawn: number,
  ) {
    this.spawnIn = firstSpawn;
    this.total = teamCount(spec, players);
    this.maxAlive = teamMaxAlive(spec, players);
    this.gap = teamGap(spec, players);
    this.rushSize = teamRush(spec, players);
  }

  /** Zombies still to come, bosses included. */
  get pending(): number {
    return this.total - this.spawned + this.spec.bosses.length - this.bossesOut;
  }

  /** Nobody else comes. */
  cancel(): void {
    this.spawned = this.total;
    this.bossesOut = this.spec.bosses.length;
    this.rushIn = null;
  }

  step(dt: number, field: Field): SpawnOrder[] {
    const out: SpawnOrder[] = [];
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) this.trickle(field, out);
    if (this.rushIn === null) return out;
    const bossesDone = this.bossesOut >= this.spec.bosses.length && field.bossAhead === null;
    this.rushIn = bossesDone ? Math.min(this.rushIn, HURRY) - dt : this.rushIn - dt;
    if (this.rushIn <= 0) this.rush(field, out);
    return out;
  }

  private trickle(field: Field, out: SpawnOrder[]): void {
    const [near, far] = this.spec.spawn;
    const boss = this.spec.bosses[this.bossesOut];
    if (boss && this.spawned >= (this.spec.bossAt[this.bossesOut] ?? 0)) {
      // A boss steps out a little nearer than the crowd, so it is seen at once.
      out.push({ kind: boss, ahead: Math.max(near, far - 4), side: 0 });
      this.bossesOut += 1;
      if (this.spec.rush && this.rushIn === null) this.rushIn = this.spec.rush.every * 0.7;
      this.spawnIn = this.gap * 1.6;
      return;
    }
    // A big boss's runners only ever come in rushes.
    if (this.spec.rush || this.spawned >= this.total || field.standing >= this.maxAlive) {
      this.spawnIn = 0.4;
      return;
    }
    // Later on the dead come in twos now and then, still never a crowd.
    const pack = this.rng.next() < this.spec.packs && field.standing + 2 <= this.maxAlive && this.spawned + 2 <= this.total ? 2 : 1;
    const half = HALF_WIDTH[this.spec.zone];
    for (let i = 0; i < pack; i++) {
      const kind = this.rng.weighted(this.spec.mix);
      // Runners start further out so their dash takes a moment longer.
      const ahead = kind === "runner" ? far : this.rng.range(near, far);
      out.push({ kind, ahead, side: this.rng.range(-half, half) * 0.9 });
      this.spawned += 1;
    }
    this.spawnIn = this.gap * this.rng.range(0.75, 1.25);
  }

  /** A pack of runners bursting out behind the boss, spread across the road. */
  private rush(field: Field, out: SpawnOrder[]): void {
    const size = Math.min(this.rushSize, this.total - this.spawned);
    const half = HALF_WIDTH[this.spec.zone] * 0.85;
    const behind = Math.max(this.spec.spawn[1], (field.bossAhead ?? 0) + 3);
    for (let i = 0; i < size; i++) {
      const lane = size > 1 ? -half + (2 * half * i) / (size - 1) : 0;
      out.push({ kind: "runner", ahead: behind + this.rng.range(0, 2.5), side: lane + this.rng.range(-0.4, 0.4), rush: true });
    }
    this.spawned += size;
    this.rushIn = this.spawned < this.total ? (this.spec.rush?.every ?? 0) : null;
  }
}
