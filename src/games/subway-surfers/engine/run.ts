import { Chase } from "./chase";
import { collectCoins, collectPickup } from "./collect";
import { Course } from "./course";
import type { CrashCause, RunEvent } from "./events";
import { JETPACK_HEIGHT, Powers } from "./powers";
import { newRunner, stepRunner, type Contact, type RunnerInput, type RunnerState } from "./runner";
import { COIN, JUMP, laneX, MAX_LEVEL, speedAt, STEP_S, TRAIN, ZONE_LENGTH, type Lane } from "./tuning";
import { frontAt, type Obstacle } from "./types";

export interface RunOptions {
  /** The tutorial: an empty yard at a gentle jog. */
  practice?: boolean;
  lane?: Lane;
}

const PRACTICE_SPEED = 5;

/**
 * One player's endless run: their runner, their copy of the yard, power
 * ups, score and the guard on their heels. It runs on a fixed step, so
 * the same inputs always give the same run.
 */
export class Run {
  readonly course: Course;
  readonly runner: RunnerState;
  readonly powers = new Powers();
  readonly chase = new Chase();
  time = 0;
  score = 0;
  coins = 0;
  streak = 0;
  level = 1;
  crashed: { cause: CrashCause; time: number; obstacleId: number | null } | null = null;
  /** Events since the last `drain`. */
  private events: RunEvent[] = [];
  private pending: RunnerInput = { lane: 0, jump: false, duck: false, ducking: false };
  private carry = 0;
  private lastCoin = -10;
  private readonly near: Obstacle[] = [];
  private readonly horned = new Set<number>();
  private readonly passed = new Set<number>();

  constructor(
    readonly seed: number,
    readonly options: RunOptions = {},
  ) {
    this.course = new Course(seed, { empty: options.practice });
    this.runner = newRunner(0, options.lane ?? 0);
    this.pending.lane = options.lane ?? 0;
    this.course.ensure(0);
  }

  get speed(): number {
    if (this.crashed) return 0;
    return this.options.practice ? PRACTICE_SPEED : speedAt(this.runner.distance);
  }

  get multiplier(): number {
    return this.level * (this.powers.has("double") ? 2 : 1);
  }

  /** Where the player wants to be, and the moves they just made. Moves wait for the next step. */
  input(lane: Lane, moves: { jump?: boolean; duck?: boolean; ducking?: boolean } = {}): void {
    this.pending.lane = lane;
    if (moves.jump) this.pending.jump = true;
    if (moves.duck) this.pending.duck = true;
    this.pending.ducking = moves.ducking ?? this.pending.ducking;
  }

  /** Runs on by `dt` seconds of real time. */
  update(dt: number): void {
    this.carry = Math.min(this.carry + dt, 0.25);
    while (this.carry >= STEP_S) {
      this.carry -= STEP_S;
      this.step(STEP_S);
    }
  }

  /** Takes the events since last asked. */
  drain(): RunEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(event: RunEvent): void {
    this.events.push(event);
  }

  private step(dt: number): void {
    this.time += dt;
    this.chase.update(dt, this.time, !!this.crashed);
    if (this.crashed) return;
    const s = this.runner;
    const before = s.distance;
    this.course.ensure(s.distance);
    this.course.near(s.distance, 14, this.near);
    const jetpack = this.powers.has("jetpack");
    const ability = { speed: this.speed, jumpHeight: this.powers.has("boots") ? JUMP.bootsHeight : JUMP.height, fly: jetpack ? JETPACK_HEIGHT : null };
    const input = this.pending;
    const result = stepRunner(s, input, this.near, ability, dt);
    input.jump = false;
    input.duck = false;

    if (result.jumped) this.emit({ type: "jump", boots: this.powers.has("boots") });
    if (result.rolled) this.emit({ type: "roll" });
    if (result.laneFrom !== null) this.emit({ type: "lane", from: result.laneFrom, to: s.lane });
    if (result.landed !== null) {
      this.emit({ type: "land", speed: result.landed, roof: s.y > 1 });
      // Coming down from a jetpack: a moment more of passing through, then solid again.
      if (s.ghost > 0.4) s.ghost = 0.4;
    }
    if (result.contact) this.onContact(result.contact);
    if (this.crashed) return;

    this.score += (s.distance - before) * this.multiplier;
    const level = Math.min(MAX_LEVEL, 1 + Math.floor(s.distance / ZONE_LENGTH));
    if (level !== this.level && !this.options.practice) {
      this.level = level;
      this.emit({ type: "level", multiplier: level });
    }
    this.collect();
    for (const kind of this.powers.tick(dt)) {
      this.emit({ type: "powerEnd", kind });
      // Falling from a jetpack's height passes through everything until the landing.
      if (kind === "jetpack") s.ghost = 3;
    }
    this.watchTrains();
    this.course.prune(s.distance);
  }

  private onContact(contact: Contact): void {
    if (contact.type === "side") {
      this.emit({ type: "stumble", side: contact.side });
      if (!this.chase.stumble(this.time)) return;
      if (this.powers.has("hoverboard")) {
        this.powers.end("hoverboard");
        this.emit({ type: "saved", cause: contact.obstacle.kind, obstacleId: contact.obstacle.id });
        this.chase.forgive();
        return;
      }
      this.crash("caught", null);
      return;
    }
    const o = contact.obstacle;
    if (!this.powers.has("hoverboard")) {
      this.crash(o.kind, o.id);
      return;
    }
    this.powers.end("hoverboard");
    this.emit({ type: "saved", cause: o.kind, obstacleId: o.id });
    const s = this.runner;
    if (o.kind === "train" || o.kind === "ramp") {
      // The board kicks the runner up onto the roof.
      s.y = TRAIN.height;
      s.vy = 5;
      s.grounded = false;
    } else this.course.smashed.add(o.id);
    s.ghost = 0.6;
  }

  private crash(cause: CrashCause, obstacleId: number | null): void {
    this.crashed = { cause, time: this.time, obstacleId };
    this.emit({ type: "crash", cause, obstacleId });
  }

  private collect(): void {
    const s = this.runner;
    for (const { coin, pulled } of collectCoins(this.course, s, this.powers.has("magnet"))) {
      this.streak = this.time - this.lastCoin < COIN.streakS ? this.streak + 1 : 1;
      this.lastCoin = this.time;
      this.coins++;
      this.score += COIN.points * this.multiplier;
      this.emit({ type: "coin", streak: this.streak, x: coin.x, y: coin.y, z: coin.z, pulled });
    }
    const pickup = collectPickup(this.course, s);
    if (!pickup) return;
    this.powers.start(pickup.kind);
    this.emit({ type: "power", kind: pickup.kind });
    if (pickup.kind === "jetpack") this.skyCoins();
  }

  /** A trail of coins in the sky, for the length of a jetpack flight. */
  private skyCoins(): void {
    const s = this.runner;
    const length = this.speed * 6.5;
    for (let z = 18; z < length; z += 3.2) {
      const lane = Math.round(Math.sin((s.distance + z) / 22) * 1.4);
      this.course.addCoin(laneX(Math.max(-1, Math.min(1, lane))), JETPACK_HEIGHT + 0.9, s.distance + z);
    }
  }

  /** Horns for trains coming at the runner, and a rush of air as they pass. */
  private watchTrains(): void {
    const s = this.runner;
    for (const o of this.course.obstacles) {
      if (!o.drift) continue;
      const gap = frontAt(o, s.distance) - s.distance;
      if (gap < 75 && gap > 0 && !this.horned.has(o.id)) {
        this.horned.add(o.id);
        this.emit({ type: "horn", lane: o.lane, obstacleId: o.id });
      }
      if (gap < 0 && !this.passed.has(o.id)) {
        this.passed.add(o.id);
        this.emit({ type: "passBy", side: laneX(o.lane) < s.x ? -1 : 1 });
      }
    }
  }
}
