import { between, pick, type Random } from "./random";
import type { FighterId, Spot } from "./types";

/** Half the width of the canvas inside the ropes, in metres. */
export const RING_HALF = 2.75;
/** How close to the ropes a boxer is allowed to drift. */
const ROOM = 2.3;
/** The gap between the boxers' middles when they trade. */
export const FIGHT_RANGE = 1.12;
const WALK = 2.2;
const CORNER = 2.25;

export type FootworkMode = "fight" | "neutral" | "corners";

/**
 * Where the boxers stand. They circle each other on their own, drift in
 * and out of range, keep off the ropes, go to a neutral corner during a
 * count and to their own corners between rounds. Players never steer
 * this: they only fight.
 */
export class Footwork {
  readonly spots: [Spot, Spot] = [
    { x: 0, z: -FIGHT_RANGE / 2 },
    { x: 0, z: FIGHT_RANGE / 2 },
  ];
  mode: FootworkMode = "fight";
  /** Who stays where they fell during a count. */
  private downed: FighterId | null = null;
  private spin = 0;
  private spinTarget = 0;
  private nextTurn = 0;
  private sway = 0;
  private readonly centre: Spot = { x: 0, z: 0 };
  /** Knockback speed along the line between them, per boxer, metres per second. */
  private readonly knock: [number, number] = [0, 0];

  constructor(private readonly random: Random) {}

  /** Which way a boxer faces, as an angle about the vertical: 0 looks along +z. */
  facing(id: FighterId): number {
    const me = this.spots[id];
    const target = this.mode === "corners" ? { x: 0, z: 0 } : this.spots[id === 0 ? 1 : 0];
    return Math.atan2(target.x - me.x, target.z - me.z);
  }

  distance(): number {
    const [a, b] = this.spots;
    return Math.hypot(b.x - a.x, b.z - a.z);
  }

  /** A clean hit drives the boxer back a step. */
  knockBack(id: FighterId, strength: number): void {
    this.knock[id] = Math.max(this.knock[id], strength);
  }

  setMode(mode: FootworkMode, downed: FighterId | null = null): void {
    this.mode = mode;
    this.downed = downed;
  }

  /** Puts both boxers in the middle facing each other, as at the start of a fight. */
  place(): void {
    this.spots[0].x = 0;
    this.spots[0].z = -FIGHT_RANGE / 2 - 0.4;
    this.spots[1].x = 0;
    this.spots[1].z = FIGHT_RANGE / 2 + 0.4;
    this.centre.x = this.centre.z = 0;
  }

  update(dtMs: number, now: number): void {
    const dt = Math.min(0.1, dtMs / 1000);
    if (this.mode === "corners") {
      this.walk(0, { x: -CORNER, z: -CORNER }, dt, WALK * 0.7);
      this.walk(1, { x: CORNER, z: CORNER }, dt, WALK * 0.7);
      return;
    }
    if (this.mode === "neutral" && this.downed !== null) {
      const up = this.downed === 0 ? 1 : 0;
      this.walk(up, this.neutralCorner(up), dt, WALK * 0.8);
      return;
    }
    this.circle(dt, now);
  }

  private circle(dt: number, now: number): void {
    if (now >= this.nextTurn) {
      this.spinTarget = pick(this.random, [
        [-0.42, 1],
        [-0.22, 2],
        [0, 1.2],
        [0.22, 2],
        [0.42, 1],
      ]);
      this.nextTurn = now + between(this.random, 1400, 3600);
    }
    this.spin += (this.spinTarget - this.spin) * Math.min(1, dt * 2);
    this.sway += dt * (1.1 + 0.4 * Math.sin(now / 2300));
    const [a, b] = this.spots;
    let angle = Math.atan2(b.x - a.x, b.z - a.z) + this.spin * dt;
    // The middle of the pair drifts back toward the centre of the ring, faster near the ropes.
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const pull = Math.max(Math.abs(mx), Math.abs(mz)) > 1.1 ? 0.9 : 0.25;
    this.centre.x = mx - mx * pull * dt;
    this.centre.z = mz - mz * pull * dt;
    const range = FIGHT_RANGE + 0.1 * Math.sin(this.sway);
    // Circle away from the ropes when either boxer is backed up to them.
    for (const spot of this.spots) {
      if (Math.max(Math.abs(spot.x), Math.abs(spot.z)) > ROOM - 0.2) angle += (this.spin >= 0 ? 0.6 : -0.6) * dt;
    }
    const dir = { x: Math.sin(angle), z: Math.cos(angle) };
    for (const id of [0, 1] as const) {
      const sign = id === 0 ? -1 : 1;
      const back = this.knock[id] * dt;
      this.knock[id] = Math.max(0, this.knock[id] - dt * 6);
      const goal = {
        x: this.centre.x + (dir.x * sign * range) / 2,
        z: this.centre.z + (dir.z * sign * range) / 2,
      };
      this.walk(id, goal, dt, WALK);
      this.spots[id].x += dir.x * sign * back;
      this.spots[id].z += dir.z * sign * back;
      this.keepInside(this.spots[id]);
    }
  }

  private walk(id: FighterId, goal: Spot, dt: number, speed: number): void {
    const spot = this.spots[id];
    const dx = goal.x - spot.x;
    const dz = goal.z - spot.z;
    const gap = Math.hypot(dx, dz);
    if (gap < 1e-4) return;
    const step = Math.min(gap, speed * dt);
    spot.x += (dx / gap) * step;
    spot.z += (dz / gap) * step;
    this.keepInside(spot);
  }

  private keepInside(spot: Spot): void {
    spot.x = Math.max(-ROOM, Math.min(ROOM, spot.x));
    spot.z = Math.max(-ROOM, Math.min(ROOM, spot.z));
  }

  /** The neutral corner furthest from the boxer who is down. */
  private neutralCorner(id: FighterId): Spot {
    const down = this.spots[id === 0 ? 1 : 0];
    const corners = [
      { x: -CORNER, z: CORNER },
      { x: CORNER, z: -CORNER },
    ];
    return corners.reduce((best, c) => (Math.hypot(c.x - down.x, c.z - down.z) > Math.hypot(best.x - down.x, best.z - down.z) ? c : best));
  }
}
