import type { Level, Orb, Pad, Portal, Solid, SpeedGate, Spike } from "./types";

/** Buckets are this many blocks wide. The player only ever looks in the one or two it spans. */
const BUCKET = 4;

/** Things of one kind, filed by where they are across the level, so a step only checks what is near. */
class Buckets<T> {
  private readonly cells = new Map<number, T[]>();

  constructor(items: readonly T[], span: (item: T) => [number, number]) {
    for (const item of items) {
      const [from, to] = span(item);
      for (let c = Math.floor(from / BUCKET); c <= Math.floor(to / BUCKET); c++) {
        const cell = this.cells.get(c);
        if (cell) cell.push(item);
        else this.cells.set(c, [item]);
      }
    }
  }

  /** Everything touching [from, to], possibly twice when it spans buckets. */
  near(from: number, to: number, out: Set<T>): Set<T> {
    out.clear();
    for (let c = Math.floor(from / BUCKET); c <= Math.floor(to / BUCKET); c++) {
      for (const item of this.cells.get(c) ?? []) out.add(item);
    }
    return out;
  }
}

/**
 * A level made quick to ask: what is solid, sharp or bouncy near here,
 * and how fast the level runs at any point. Built once per level.
 */
export class World {
  private readonly solids: Buckets<Solid>;
  private readonly spikes: Buckets<Spike>;
  private readonly pads: Buckets<Pad>;
  private readonly orbs: Buckets<Orb>;
  private readonly speeds: SpeedGate[];
  private readonly portals: Portal[];
  // Reused between steps so a step makes no garbage.
  private readonly scratch = { solids: new Set<Solid>(), spikes: new Set<Spike>(), pads: new Set<Pad>(), orbs: new Set<Orb>() };

  constructor(readonly level: Level) {
    this.solids = new Buckets(level.solids, (s) => [s.x, s.x + s.w]);
    this.spikes = new Buckets(level.spikes, (s) => [s.x, s.x + 1]);
    this.pads = new Buckets(level.pads, (p) => [p.x, p.x + 1]);
    this.orbs = new Buckets(level.orbs, (o) => [o.x - 1, o.x + 1]);
    this.speeds = [...level.speeds].sort((a, b) => a.x - b.x);
    this.portals = [...level.portals].sort((a, b) => a.x - b.x);
  }

  solidsNear(x: number): Set<Solid> {
    return this.solids.near(x - 1.5, x + 1.5, this.scratch.solids);
  }

  spikesNear(x: number): Set<Spike> {
    return this.spikes.near(x - 1.5, x + 1.5, this.scratch.spikes);
  }

  padsNear(x: number): Set<Pad> {
    return this.pads.near(x - 1.5, x + 1.5, this.scratch.pads);
  }

  orbsNear(x: number): Set<Orb> {
    return this.orbs.near(x - 1.5, x + 1.5, this.scratch.orbs);
  }

  /** Blocks per second at this point of the level. */
  speedAt(x: number): number {
    let speed = this.level.startSpeed;
    for (const gate of this.speeds) {
      if (gate.x > x) break;
      speed = gate.speed;
    }
    return speed;
  }

  /** The first portal passed when moving from `from` to `to`, if any. */
  portalBetween(from: number, to: number): Portal | null {
    for (const portal of this.portals) {
      if (portal.x > to) break;
      if (portal.x > from) return portal;
    }
    return null;
  }

  /** The last portal at or before x, which sets the mode there. */
  portalAt(x: number): Portal | null {
    let found: Portal | null = null;
    for (const portal of this.portals) {
      if (portal.x > x) break;
      found = portal;
    }
    return found;
  }
}
