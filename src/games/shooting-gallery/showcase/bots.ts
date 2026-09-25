import type { Seat } from "@/platform/protocol";
import { KINDS } from "../engine/kinds";
import { CAMERA, type Vec3 } from "../engine/layout";
import type { Ray } from "../engine/raycast";
import { Rng } from "../engine/rng";
import type { Round, Shot } from "../engine/round";
import { SPEED_RAMP } from "../engine/rules";
import type { Target } from "../engine/target";

/** How stiffly a bot's aim springs onto its target. Higher swings faster. */
const SNAP = 10;
/** How close, in metres, the dot must settle on its spot before the trigger is pulled. */
const STEADY = 0.05;
/** Targets further out than this are about to leave, so nobody starts on them. */
const REACH_X = 3.7;

/** The middle of a target's face, where a steady player aims. */
export function centreOf(target: Target): Vec3 {
  const info = KINDS[target.kind];
  const shape = info.shapes[0]!;
  return {
    x: target.x + shape.x * target.facing * info.scale,
    y: target.y + shape.y * info.scale,
    z: target.z,
  };
}

/** A ray from the game's own camera through a point, exactly as a phone's aim would make. */
export function rayThrough(point: Vec3): Ray {
  const o = CAMERA.position;
  return { origin: { ...o }, dir: { x: point.x - o.x, y: point.y - o.y, z: point.z - o.z } };
}

/**
 * A computer player for the showcase. It picks a target on its own side
 * of the booth, swings its laser over, and pulls the trigger once the dot
 * settles. Now and then it aims just off the edge and misses, so the wall
 * gets its pock marks too.
 */
export class Bot {
  readonly aim: Vec3;
  private readonly speed = { x: 0, y: 0 };
  private readonly rng: Rng;
  private target: Target | null = null;
  /** Where on the target this shot is meant to land, from its middle. Players are never dead centre. */
  private readonly offset = { x: 0, y: 0 };
  private readyAt = 0;

  constructor(
    readonly seat: Seat,
    /** Where across the booth this player tends to look. */
    private readonly side: number,
    seed: number,
    /** The round time it starts shooting. */
    openFire: number,
  ) {
    this.rng = new Rng(seed);
    this.aim = { x: side, y: 1.6, z: -1.6 };
    this.readyAt = openFire + this.rng.range(0, 0.6);
  }

  /** One step. Returns the shot when the bot fires and it counts. */
  step(round: Round, dt: number, claimed: ReadonlySet<number>, waitFor: ReadonlySet<number>): Shot | null {
    const ramp = 1 + SPEED_RAMP * round.progress;
    const star = this.star(round.targets, claimed, waitFor);
    if (star && star !== this.target) this.pick(star);
    else if (!this.worthKeeping(this.target, waitFor)) this.pick(this.choose(round.targets, claimed, waitFor));
    const want = this.target ? centreOf(this.target) : { x: this.side, y: 1.7, z: -1.6 };
    want.x += this.offset.x;
    want.y += this.offset.y;
    // A critically damped spring that tracks the target's own speed, the way a player's arm follows a moving duck.
    const follow = { x: this.target ? this.target.vx * ramp : 0, y: 0 };
    for (const axis of ["x", "y"] as const) {
      this.speed[axis] += (SNAP * SNAP * (want[axis] - this.aim[axis]) - 2 * SNAP * (this.speed[axis] - follow[axis])) * dt;
      this.aim[axis] += this.speed[axis] * dt;
    }
    this.aim.z = want.z;
    if (!this.target || round.time < this.readyAt) return null;
    const off = Math.hypot(want.x - this.aim.x, want.y - this.aim.y);
    if (off > STEADY) return null;
    const ray = rayThrough(this.aim);
    // Hold fire while a spared target is in the way, so the golden duck is not shot before its moment.
    const blocker = round.probe(ray).target;
    if (blocker && waitFor.has(blocker.id)) return null;
    const shot = round.shoot(this.seat, ray);
    if (!shot) return null;
    this.readyAt = round.time + this.rng.range(0.6, 1.1);
    this.target = null;
    return shot;
  }

  /** The target it is swinging toward, so others leave it be. */
  get chosen(): number | null {
    return this.target?.id ?? null;
  }

  /** A golden duck in reach that nobody has yet: whoever is near it drops what they were doing. */
  private star(targets: readonly Target[], claimed: ReadonlySet<number>, waitFor: ReadonlySet<number>): Target | null {
    const golden = targets.find((t) => t.kind === "golden" && !t.hit && !waitFor.has(t.id) && Math.abs(t.x) < REACH_X);
    if (!golden || (claimed.has(golden.id) && this.target !== golden)) return null;
    return Math.abs(golden.x - this.side) < 1.3 ? golden : null;
  }

  /** Takes a target, and decides where on it to aim: mostly well inside, now and then just off the edge. */
  private pick(target: Target | null): void {
    this.target = target;
    if (!target) return;
    const info = KINDS[target.kind];
    const shape = info.shapes[0]!;
    const reach = this.rng.chance(0.1) ? 1.25 : this.rng.range(0, 0.6);
    // Upward of the middle, since the wave in front hides the bottom of most things.
    const angle = this.rng.range(-0.3, Math.PI + 0.3);
    this.offset.x = Math.cos(angle) * shape.rx * info.scale * reach;
    this.offset.y = Math.sin(angle) * shape.ry * info.scale * reach;
  }

  private worthKeeping(target: Target | null, waitFor: ReadonlySet<number>): target is Target {
    if (!target || target.hit || waitFor.has(target.id)) return false;
    if (target.lane === "pop" && target.raise < 0.95) return false;
    return Math.abs(target.x) < REACH_X + 0.4;
  }

  /** The nearest live target on its side, with a pull toward golden ducks and bullseyes. */
  private choose(targets: readonly Target[], claimed: ReadonlySet<number>, waitFor: ReadonlySet<number>): Target | null {
    let best: Target | null = null;
    let bestCost = Infinity;
    for (const target of targets) {
      if (claimed.has(target.id) || !this.worthKeeping(target, waitFor) || Math.abs(target.x) > REACH_X) continue;
      const centre = centreOf(target);
      let cost = Math.abs(centre.x - this.side) * 0.7 + Math.hypot(centre.x - this.aim.x, centre.y - this.aim.y) * 0.4;
      if (target.kind === "golden") cost -= 3;
      if (target.kind === "bullseye" || target.kind === "plate") cost -= 0.4;
      cost += this.rng.range(0, 0.5);
      if (cost < bestCost) {
        bestCost = cost;
        best = target;
      }
    }
    return best;
  }
}
