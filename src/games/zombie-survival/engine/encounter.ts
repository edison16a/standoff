import type { GameEvent } from "./events";
import { Rng } from "./rng";
import { HALF_WIDTH, type StageSpec } from "./stages";
import { alive, makeZombie, stepZombie, type Zombie } from "./zombie";
import { weakPointHp, type ZombieKind } from "./zombie-kinds";

/** The first zombie shows up after this long, so players can settle their aim. */
const FIRST_SPAWN = 0.9;
/** Zombies closer than this push each other apart sideways. */
const PERSONAL_SPACE = 0.95;
/** Dead zombies stay on the ground this long before they are cleared away. */
const CORPSE_SECONDS = 5;

/** How many ordinary zombies a stage sends at a team of this size. */
export function teamCount(spec: StageSpec, players: number): number {
  // A boss already grows with the team, so its escort grows more gently.
  const per = spec.boss ? 0.25 : 0.5;
  return Math.round(spec.count * (1 + per * Math.max(0, players - 1)));
}

export function teamMaxAlive(spec: StageSpec, players: number): number {
  // More guns, more at once, so a full team always has something to shoot.
  return spec.maxAlive + Math.max(0, players - 1);
}

/** Seconds between spawns for a team. A bigger team gets its bigger share sooner, so its fights do not drag. */
export function teamGap(spec: StageSpec, players: number): number {
  return spec.gap / (1 + 0.3 * Math.max(0, players - 1));
}

/**
 * One stage's fight: it lets zombies in a few at a time, walks them at
 * the team and reports their swings. It is over once every zombie the
 * stage holds, boss included, is down.
 */
export class Encounter {
  readonly zombies: Zombie[] = [];
  private spawned = 0;
  private readonly total: number;
  private readonly maxAlive: number;
  private readonly gap: number;
  private spawnIn = FIRST_SPAWN;
  private bossDue: boolean;
  private readonly rng: Rng;
  private nextId: number;

  constructor(
    readonly spec: StageSpec,
    private readonly players: number,
    seed: number,
    firstId: number,
  ) {
    this.rng = new Rng(seed);
    this.total = teamCount(spec, players);
    this.maxAlive = teamMaxAlive(spec, players);
    this.gap = teamGap(spec, players);
    this.bossDue = spec.boss !== undefined;
    this.nextId = firstId;
  }

  get idCursor(): number {
    return this.nextId;
  }

  get done(): boolean {
    return !this.bossDue && this.spawned >= this.total && !this.zombies.some(alive);
  }

  /** Zombies still to come plus those standing, for the screen's counter. */
  get remaining(): number {
    return this.total - this.spawned + (this.bossDue ? 1 : 0) + this.zombies.filter(alive).length;
  }

  find(id: number): Zombie | undefined {
    return this.zombies.find((z) => z.id === id);
  }

  /** Advances the fight. Returns the damage the team took this step. */
  update(dt: number, emit: (event: GameEvent) => void): number {
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) this.trySpawn(emit);
    let harm = 0;
    for (const z of this.zombies) {
      const swing = stepZombie(z, dt);
      if (swing > 0) {
        harm += swing;
        emit({ type: "swing", zombie: z.id, kind: z.kind, damage: swing });
      }
    }
    this.separate();
    // Clear old bodies so the list stays short over a long fight.
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i]!;
      if (z.state === "dead" && z.stateTime > CORPSE_SECONDS) this.zombies.splice(i, 1);
    }
    return harm;
  }

  private trySpawn(emit: (event: GameEvent) => void): void {
    const standing = this.zombies.filter((z) => alive(z) && !z.weak.length).length;
    if (this.bossDue && this.spec.boss) {
      this.bossDue = false;
      this.add(this.spec.boss, Math.max(this.spec.spawn[0], this.spec.spawn[1] - 4), 0, emit);
      this.spawnIn = this.gap * 1.6;
      return;
    }
    if (this.spawned >= this.total || standing >= this.maxAlive) {
      this.spawnIn = 0.4;
      return;
    }
    // Later on the dead come in twos now and then, still never a crowd.
    const pack = this.rng.next() < this.spec.packs && standing + 2 <= this.maxAlive && this.spawned + 2 <= this.total ? 2 : 1;
    for (let i = 0; i < pack; i++) {
      const kind = this.rng.weighted(this.spec.mix);
      const half = HALF_WIDTH[this.spec.zone];
      // Runners start further out so their dash takes a moment longer.
      const far = kind === "runner" ? this.spec.spawn[1] : this.rng.range(this.spec.spawn[0], this.spec.spawn[1]);
      this.add(kind, far, this.rng.range(-half, half) * 0.9, emit);
      this.spawned += 1;
    }
    this.spawnIn = this.gap * this.rng.range(0.75, 1.25);
  }

  private add(kind: ZombieKind, ahead: number, side: number, emit: (event: GameEvent) => void): void {
    const half = HALF_WIDTH[this.spec.zone];
    const front = Math.min(half - 0.6, 3.2);
    const z = makeZombie(this.nextId++, kind, ahead, side, this.rng.range(-front, front), {
      hpScale: this.spec.tough,
      speedScale: this.spec.speed,
      harm: this.spec.harm,
      weakHp: weakPointHp(kind, this.players),
      seed: this.rng.next(),
    });
    this.zombies.push(z);
    emit({ type: "spawn", zombie: z.id, kind });
  }

  /** Keeps zombies from walking through each other, bosses taking more room. */
  private separate(): void {
    const standing = this.zombies.filter(alive);
    for (let i = 0; i < standing.length; i++) {
      for (let j = i + 1; j < standing.length; j++) {
        const a = standing[i]!;
        const b = standing[j]!;
        const room = PERSONAL_SPACE * (a.weak.length || b.weak.length ? 2 : 1);
        const dx = b.side - a.side;
        const dz = b.ahead - a.ahead;
        const dist = Math.hypot(dx, dz);
        if (dist >= room) continue;
        const push = (room - dist) * 0.5;
        const dir = dx === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(dx);
        const half = HALF_WIDTH[this.spec.zone];
        a.side = Math.max(-half, Math.min(half, a.side - dir * push));
        b.side = Math.max(-half, Math.min(half, b.side + dir * push));
      }
    }
  }
}
