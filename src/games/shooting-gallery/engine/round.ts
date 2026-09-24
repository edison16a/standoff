import type { Seat } from "@/platform/protocol";
import { KINDS, type TargetKind } from "./kinds";
import type { Vec3 } from "./layout";
import { advance, keepApart } from "./motion";
import { probe, type Probe, type Ray } from "./raycast";
import { Rng } from "./rng";
import { COOLDOWN_S, COUNTDOWN_S, FALL_S, FINAL_SECONDS, SPEED_RAMP } from "./rules";
import { emptyTally, rank, type Standing, type Tally } from "./scoring";
import { Spawner } from "./spawner";
import type { Target } from "./target";

export type RoundPhase = "countdown" | "playing" | "over";

export interface RoundOptions {
  seats: readonly Seat[];
  seconds: number;
  seed: number;
  /**
   * The lobby's endless round: no countdown, no end and no scores, just
   * ducks to look at while everyone gets ready.
   */
  practice?: boolean;
}

/** Something that happened, for the sound and the pictures to react to. */
export type RoundEvent =
  | { type: "count"; n: number }
  | { type: "go" }
  | { type: "final"; n: number }
  | { type: "over" }
  | { type: "landed"; target: Target };

/** A trigger pull that counted, and what it struck. */
export interface Shot {
  seat: Seat;
  point: Vec3;
  target: Target | null;
  kind: TargetKind | null;
  points: number;
  bull: boolean;
}

/**
 * One round of the gallery, with no knowledge of screens or networks. The
 * host feeds it time and shots, and reads back targets, scores and what
 * happened. It never reads a clock of its own, so tests drive it exactly.
 */
export class Round {
  time = 0;
  phase: RoundPhase;
  targets: Target[];
  private readonly tallies = new Map<Seat, Tally>();
  private readonly lastShot = new Map<Seat, number>();
  private readonly spawner: Spawner;
  private readonly landed = new Set<number>();
  private readonly start: number;
  private readonly end: number;

  constructor(private readonly options: RoundOptions) {
    this.spawner = new Spawner(new Rng(options.seed), !options.practice);
    this.targets = this.spawner.prefill();
    this.start = options.practice ? 0 : COUNTDOWN_S;
    this.end = options.practice ? Infinity : this.start + options.seconds;
    this.phase = options.practice ? "playing" : "countdown";
    for (const seat of options.seats) this.tallies.set(seat, emptyTally(seat));
  }

  get seats(): Seat[] {
    return [...this.tallies.keys()];
  }

  /** Seconds of shooting left, counting the countdown as not started. */
  get timeLeft(): number {
    return Math.max(0, Math.min(this.options.seconds, this.end - this.time));
  }

  /** From 0 at the first shot to 1 at the buzzer. */
  get progress(): number {
    if (this.options.practice) return 0;
    return Math.min(1, Math.max(0, (this.time - this.start) / this.options.seconds));
  }

  /** Whole seconds left in the countdown, or 0 once it is over. */
  get countdown(): number {
    return this.phase === "countdown" ? Math.ceil(this.start - this.time) : 0;
  }

  tick(dt: number): RoundEvent[] {
    const events: RoundEvent[] = [];
    const before = this.time;
    this.time += dt;
    const now = this.time;
    if (this.phase === "countdown") {
      for (let n = COUNTDOWN_S; n >= 1; n--) if (before <= this.start - n && now > this.start - n) events.push({ type: "count", n });
      if (now >= this.start) {
        this.phase = "playing";
        events.push({ type: "go" });
      }
    }
    if (this.phase === "playing") {
      for (let n = FINAL_SECONDS; n >= 1; n--) if (before < this.end - n && now >= this.end - n) events.push({ type: "final", n });
      if (now >= this.end) {
        this.phase = "over";
        events.push({ type: "over" });
      }
    }
    const ramp = 1 + SPEED_RAMP * this.progress;
    this.targets = this.targets.filter((target) => advance(target, now, dt, ramp));
    keepApart(this.targets);
    // Once the buzzer goes nothing new comes on, so the booth empties out behind the results.
    if (this.phase !== "over") this.targets.push(...this.spawner.update(now, dt, ramp, this.progress, this.targets));
    for (const target of this.targets) {
      if (target.hit && !this.landed.has(target.id) && now >= target.hit.at + FALL_S) {
        this.landed.add(target.id);
        events.push({ type: "landed", target });
      }
    }
    return events;
  }

  /** What a ray from the camera meets right now. Used for the laser dot too. */
  probe(ray: Ray): Probe {
    return probe(this.targets, ray);
  }

  /**
   * A trigger pull. Returns null when it does not count: before the start,
   * after the buzzer, from someone not in the round, or while the gun is
   * still being pumped.
   */
  shoot(seat: Seat, ray: Ray): Shot | null {
    const tally = this.tallies.get(seat);
    const practice = this.options.practice === true;
    if (this.phase !== "playing" || (!tally && !practice)) return null;
    const last = this.lastShot.get(seat) ?? -Infinity;
    // A hair of slack, so a phone pumping exactly on the beat is never refused by rounding.
    if (this.time - last < COOLDOWN_S - 1e-6) return null;
    this.lastShot.set(seat, this.time);

    const found = this.probe(ray);
    const target = found.target;
    const info = target ? KINDS[target.kind] : null;
    const points = info ? (found.bull ? (info.bullPoints ?? info.points) : info.points) : 0;
    if (target) target.hit = { at: this.time, by: practice ? null : seat, point: found.point, points, bull: found.bull };
    if (tally) {
      tally.shots++;
      if (target) {
        tally.hits++;
        tally.score += points;
        if (found.bull || target.kind === "golden") tally.specials++;
      }
    }
    return { seat, point: found.point, target, kind: target?.kind ?? null, points: practice ? 0 : points, bull: found.bull };
  }

  tally(seat: Seat): Tally | null {
    return this.tallies.get(seat) ?? null;
  }

  standings(): Standing[] {
    return rank([...this.tallies.values()]);
  }
}
