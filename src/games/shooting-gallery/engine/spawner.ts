import { GOLDEN_CHANCE, GOLDEN_MAX, POP_TIME_S } from "./rules";
import type { TargetKind } from "./kinds";
import { LANES, OFFSTAGE_X, type LaneId } from "./layout";
import type { Rng } from "./rng";
import type { Target } from "./target";

type DuckLane = Extract<LaneId, "back" | "front">;
const DUCK_LANES: readonly DuckLane[] = ["back", "front"];

/** Pop ups stay inside this, clear of the side posts. */
export const POP_HALF_SPAN = 3.5;
const POP_MIN_APART = 1.2;

/**
 * Decides what comes on stage and when. Duck lanes keep a steady stream
 * with uneven gaps, like a real chain of ducks. Bullseyes pop up a few at
 * a time and plates race along the rail now and then. Everything comes
 * from the seeded random source, so a seed replays the same round.
 */
export class Spawner {
  private nextId = 1;
  private readonly travelled: Record<DuckLane, number> = { back: 0, front: 0 };
  private readonly gap: Record<DuckLane, number> = { back: 0, front: 0 };
  private nextPopAt: number;
  private nextPlateAt: number;
  private goldens = 0;

  constructor(
    private readonly rng: Rng,
    private readonly golden: boolean,
  ) {
    for (const lane of DUCK_LANES) this.gap[lane] = this.duckGap();
    this.nextPopAt = rng.range(0.2, 0.8);
    this.nextPlateAt = rng.range(1.5, 3);
  }

  /** Ducks already spread along both lanes, so a round never opens on an empty booth. */
  prefill(): Target[] {
    const out: Target[] = [];
    for (const lane of DUCK_LANES) {
      const dir = LANES[lane].dir;
      for (let along = this.rng.range(0.4, 1.2); along < OFFSTAGE_X * 2; along += this.duckGap()) {
        out.push(this.duck(lane, -dir * OFFSTAGE_X + dir * along, 0, false));
      }
    }
    return out;
  }

  /** New targets for this step. `ramp` is the round's current speed factor. */
  update(time: number, dt: number, ramp: number, progress: number, targets: readonly Target[]): Target[] {
    const out: Target[] = [];
    for (const lane of DUCK_LANES) {
      this.travelled[lane] += LANES[lane].speed * ramp * dt;
      if (this.travelled[lane] >= this.gap[lane]) {
        this.travelled[lane] = 0;
        this.gap[lane] = this.duckGap();
        out.push(this.duck(lane, -LANES[lane].dir * OFFSTAGE_X, time, time > 3));
      }
    }
    if (time >= this.nextPopAt) {
      const pops = targets.filter((t) => t.lane === "pop");
      const max = progress > 0.5 ? 3 : 2;
      if (pops.filter((t) => !t.hit).length < max) {
        const pop = this.pop(time, progress, pops);
        if (pop) out.push(pop);
      }
      this.nextPopAt = time + this.rng.range(0.5, 1.4);
    }
    if (time >= this.nextPlateAt) {
      if (targets.filter((t) => t.lane === "rail").length < 2) out.push(this.plate(time));
      this.nextPlateAt = time + this.rng.range(2.2, 4.2);
    }
    return out;
  }

  private duckGap(): number {
    return this.rng.range(1.35, 2.5);
  }

  private duck(lane: DuckLane, x: number, time: number, goldenAllowed: boolean): Target {
    let kind: TargetKind = "duck";
    if (this.golden && goldenAllowed && this.goldens < GOLDEN_MAX && this.rng.chance(GOLDEN_CHANCE)) {
      kind = "golden";
      this.goldens++;
    } else if (this.rng.chance(0.22)) kind = "duckling";
    const { dir, speed, z, y } = LANES[lane];
    return this.make(kind, lane, x, y, z, dir * speed, dir, time);
  }

  private pop(time: number, progress: number, others: readonly Target[]): Target | null {
    const lane = LANES.pop;
    for (let tries = 0; tries < 6; tries++) {
      const x = this.rng.range(-POP_HALF_SPAN, POP_HALF_SPAN);
      if (others.some((o) => Math.abs(o.x - x) < POP_MIN_APART)) continue;
      const slide = this.rng.chance(0.65) ? this.rng.sign() * this.rng.range(0.25, 0.75) : 0;
      const target = this.make("bullseye", "pop", x, lane.y, lane.z, slide, 1, time);
      target.lowerAt = time + POP_TIME_S + this.rng.range(2.1, 3.3) * (1 - 0.3 * progress);
      return target;
    }
    return null;
  }

  private plate(time: number): Target {
    const lane = LANES.rail;
    const dir = this.rng.sign();
    return this.make("plate", "rail", -dir * OFFSTAGE_X, lane.y, lane.z, dir * this.rng.range(0.85, 1.2) * lane.speed, dir, time);
  }

  private make(kind: TargetKind, lane: LaneId, x: number, y: number, z: number, vx: number, facing: 1 | -1, time: number): Target {
    return { id: this.nextId++, kind, lane, x, y, z, vx, facing, born: time, raise: lane === "pop" ? 0 : 1, lowerAt: Infinity, hit: null };
  }
}
