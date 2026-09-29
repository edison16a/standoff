import type { GameEvent } from "./events";
import { Rng } from "./rng";
import { Spawner, type SpawnOrder } from "./spawner";
import { HALF_WIDTH, type StageSpec } from "./stages";
import { alive, makeZombie, sideRoom, stepZombie, type Zombie } from "./zombie";
import { isBoss, weakPointHp } from "./zombie-kinds";

export { teamCount, teamGap, teamMaxAlive, teamRush } from "./spawner";

/** The first zombie shows up after this long, so players can settle their aim. */
const FIRST_SPAWN = 0.5;
/** Zombies closer than this push each other apart sideways. */
const PERSONAL_SPACE = 0.95;
/** Dead zombies stay on the ground this long before they are cleared away. */
const CORPSE_SECONDS = 5;

/**
 * How hard each swing lands on a team. Four guns spread over the crowd
 * drop almost everything before it arrives, so the few that get through
 * hit harder, and a sloppy team still falls before the ship.
 */
export function teamHarm(spec: StageSpec, players: number): number {
  return spec.harm * (1 + 0.3 * Math.max(0, players - 1));
}

/**
 * One stage's fight: it lets zombies in as the spawner says, walks them
 * at the team and reports their swings. It is over once every zombie the
 * stage holds, bosses included, is down.
 */
export class Encounter {
  readonly zombies: Zombie[] = [];
  private readonly spawner: Spawner;
  private readonly rng: Rng;
  private nextId: number;

  /** `firstSpawn` lets the showcase keep the timing its captured clip was made with. */
  constructor(
    readonly spec: StageSpec,
    private readonly players: number,
    seed: number,
    firstId: number,
    firstSpawn = FIRST_SPAWN,
  ) {
    this.rng = new Rng(seed);
    this.spawner = new Spawner(spec, players, this.rng, firstSpawn);
    this.nextId = firstId;
  }

  get idCursor(): number {
    return this.nextId;
  }

  get done(): boolean {
    return this.spawner.pending === 0 && !this.zombies.some(alive);
  }

  /** Zombies still to come plus those standing, for the screen's counter. */
  get remaining(): number {
    return this.spawner.pending + this.zombies.filter(alive).length;
  }

  find(id: number): Zombie | undefined {
    return this.zombies.find((z) => z.id === id);
  }

  /** A test shortcut: every zombie still to come stays away and every one standing drops. */
  wipe(): void {
    this.spawner.cancel();
    for (const z of this.zombies) {
      if (!alive(z)) continue;
      z.hp = 0;
      z.weak = z.weak.map(() => 0);
      z.state = "dead";
      z.stateTime = 0;
      z.death = { head: false, seat: 0 };
    }
  }

  /** Advances the fight. Returns the damage the team took this step. */
  update(dt: number, emit: (event: GameEvent) => void): number {
    const standing = this.zombies.filter(alive);
    const boss = standing.find((z) => isBoss(z.kind));
    const orders = this.spawner.step(dt, { standing: standing.filter((z) => !isBoss(z.kind)).length, bossAhead: boss?.ahead ?? null });
    const rushers = orders.filter((o) => o.rush).length;
    if (rushers > 0) emit({ type: "rush", count: rushers });
    for (const order of orders) this.add(order, emit);
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

  private add(order: SpawnOrder, emit: (event: GameEvent) => void): void {
    const half = HALF_WIDTH[this.spec.zone];
    const front = Math.min(half - 0.6, 3.2);
    // A rusher keeps to its lane, so the pack fans out across the front line.
    const targetSide = order.rush ? Math.max(-front, Math.min(front, order.side)) : this.rng.range(-front, front);
    const z = makeZombie(this.nextId++, order.kind, order.ahead, order.side, targetSide, {
      hpScale: this.spec.tough,
      speedScale: this.spec.speed,
      harm: teamHarm(this.spec, this.players),
      weakHp: weakPointHp(order.kind, this.players),
      seed: this.rng.next(),
    });
    this.zombies.push(z);
    emit({ type: "spawn", zombie: z.id, kind: order.kind });
  }

  /** A side position kept on the street and on screen. */
  private keepInView(z: Zombie, side: number): number {
    const room = Math.min(HALF_WIDTH[this.spec.zone], sideRoom(z.ahead));
    return Math.max(-room, Math.min(room, side));
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
        a.side = this.keepInView(a, a.side - dir * push);
        b.side = this.keepInView(b, b.side + dir * push);
        // With no room left to the sides, the one behind waits its turn a step back.
        const left = room - Math.hypot(b.side - a.side, b.ahead - a.ahead);
        if (left <= 0) continue;
        const back = a.ahead > b.ahead || (a.ahead === b.ahead && a.id > b.id) ? a : b;
        back.ahead += left;
      }
    }
  }
}
