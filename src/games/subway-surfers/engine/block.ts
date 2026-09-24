import { BARRIER, COIN, JUMP, laneX, RAMP_LENGTH, TRAIN, trainLength, type Lane } from "./tuning";
import type { Obstacle, ObstacleKind, PowerKind } from "./types";

/** How far ahead the fog lets a player see a train coming. */
export const VIEW_DISTANCE = 150;

type Draft = Omit<Obstacle, "id">;

/**
 * One stretch of track being laid out by a pattern: its obstacles, coins
 * and power ups, in metres from the stretch's start. `sec` turns seconds
 * of running into metres at this stretch's speed, so gaps stay fair as
 * the pace rises.
 */
export class Block {
  readonly obstacles: Draft[] = [];
  readonly coins: { x: number; y: number; z: number }[] = [];
  readonly pickups: { kind: PowerKind; lane: Lane; y: number; z: number }[] = [];
  /** The stretch ends at least here, past everything placed. */
  end = 0;

  constructor(
    readonly speed: number,
    private readonly style: () => number,
  ) {}

  sec(seconds: number): number {
    return seconds * this.speed;
  }

  private add(kind: ObstacleKind, lane: Lane, z: number, length: number, drift = 0, cars = 0): Draft {
    const draft: Draft = { kind, lane, z, length, drift, style: this.style(), cars };
    this.obstacles.push(draft);
    this.reach(z + length);
    return draft;
  }

  reach(z: number): void {
    this.end = Math.max(this.end, z);
  }

  low(lane: Lane, z: number): void {
    this.add("low", lane, z, BARRIER.depth);
  }

  high(lane: Lane, z: number): void {
    this.add("high", lane, z, BARRIER.depth);
  }

  barrier(lane: Lane, z: number, high: boolean): void {
    if (high) this.high(lane, z);
    else this.low(lane, z);
  }

  /** A standing train. Returns where it ends. */
  train(lane: Lane, z: number, cars: number, ramp = false): number {
    if (ramp) this.add("ramp", lane, z - RAMP_LENGTH, RAMP_LENGTH);
    this.add("train", lane, z, trainLength(cars), 0, cars);
    return z + trainLength(cars);
  }

  /**
   * A train rolling toward the runner, its front reaching `meet` as they
   * do. The rest of its lane is kept clear for as far as it could be seen
   * rolling in, so it never drives through anything.
   */
  moving(lane: Lane, meet: number, cars: number, drift: number): void {
    const length = trainLength(cars);
    this.add("train", lane, meet, length, drift, cars);
    this.reach(meet + (drift * VIEW_DISTANCE) / (1 + drift) + length + 6);
  }

  coinLine(lane: Lane, from: number, to: number, y = COIN.y, gap = 3): void {
    const count = Math.max(1, Math.floor((to - from) / gap) + 1);
    for (let i = 0; i < count; i++) this.coins.push({ x: laneX(lane), y, z: from + i * gap });
    this.reach(to);
  }

  /** Coins along the path of a jump that tops out over `z`. */
  coinArc(lane: Lane, z: number, base = 0, height = JUMP.height): void {
    const half = this.sec(Math.sqrt((2 * height) / JUMP.gravity));
    const count = 7;
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) * 2 - 1;
      this.coins.push({ x: laneX(lane), y: base + COIN.y + height * (1 - t * t), z: z + t * half });
    }
  }

  /** Coins up a ramp and along the roof behind it. */
  roofCoins(lane: Lane, from: number, to: number): void {
    this.coinLine(lane, from, to, TRAIN.height + COIN.y, 3.2);
  }

  /** Coins snaking from one lane to another, showing the way. */
  coinWeave(from: Lane, to: Lane, z: number, length: number): void {
    const count = Math.max(4, Math.round(length / 3));
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const ease = t * t * (3 - 2 * t);
      this.coins.push({ x: laneX(from + (to - from) * ease), y: COIN.y, z: z + t * length });
    }
    this.reach(z + length);
  }

  pickup(kind: PowerKind, lane: Lane, z: number, y = 1.15): void {
    this.pickups.push({ kind, lane, y, z });
    this.reach(z);
  }
}
