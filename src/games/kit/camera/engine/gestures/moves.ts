import type { Body, Hand } from "../body";
import type { Baseline } from "../calibration";
import { DuckDetector } from "./duck";
import { GuardDetector } from "./guard";
import { JumpDetector } from "./jump";
import { LaneTracker } from "./lane";
import { LeanDetector, type Side } from "./lean";
import { DEFAULT_MOVES, tune, type MoveOptions, type MoveTuning } from "./options";
import { PunchDetector, type Punch } from "./punch";
import { StandingReference } from "./reference";

/** Everything one player is doing right now. Games read it every frame. */
export interface MoveState {
  slot: number;
  /** In view now. */
  present: boolean;
  /** Has a baseline. Jumps, ducks and lanes need one. Guard, punches and leans work without. */
  calibrated: boolean;
  lane: number;
  /** The hips from the player's spot, in their shoulder widths, negative to the left. */
  offset: number;
  jumping: boolean;
  ducking: boolean;
  lean: Side;
  guard: boolean;
  /** How clearly each move is happening, 0 to 1. */
  confidence: { lane: number; jump: number; duck: number; lean: number; guard: number };
  /** The raw measures in torso lengths, for games that want their own thresholds. */
  amounts: { rise: number; drop: number; lean: number };
}

/** Something that happened, on the frame it happened. Punches only ever arrive as events. */
export type MoveEvent = { slot: number; time: number } & (
  | { type: "jump"; confidence: number }
  | { type: "land" }
  | { type: "duck"; confidence: number }
  | { type: "stand" }
  | { type: "lane"; lane: number; from: number }
  | { type: "lean"; side: Side }
  | { type: "guard"; up: boolean }
  | ({ type: "punch" } & Punch)
  | { type: "away" }
  | { type: "back" }
);

const DEFAULT_ARM = 1.1;

export function idleState(slot: number, calibrated = false): MoveState {
  return {
    slot,
    present: false,
    calibrated,
    lane: 0,
    offset: 0,
    jumping: false,
    ducking: false,
    lean: 0,
    guard: false,
    confidence: { lane: 0, jump: 0, duck: 0, lean: 0, guard: 0 },
    amounts: { rise: 0, drop: 0, lean: 0 },
  };
}

/**
 * Reads every move for one player from their body, frame by frame. Pure:
 * it only needs bodies with times, so tests drive it with made up poses.
 */
export class MoveReader {
  private options: MoveOptions;
  private baseline: Baseline | null = null;
  private reference: StandingReference | null = null;
  private readonly jump: JumpDetector;
  private readonly duck: DuckDetector;
  private readonly lean: LeanDetector;
  private readonly guard: GuardDetector;
  private readonly lane: LaneTracker;
  private readonly punches: Record<Hand, PunchDetector>;
  private state: MoveState;
  private lastTime: number | null = null;

  constructor(
    readonly slot: number,
    tuning: MoveTuning = {},
  ) {
    this.options = tune(DEFAULT_MOVES, tuning);
    this.jump = new JumpDetector(this.options.jump);
    this.duck = new DuckDetector(this.options.duck);
    this.lean = new LeanDetector(this.options.lean);
    this.guard = new GuardDetector(this.options.guard);
    this.lane = new LaneTracker(this.options.lane);
    this.punches = { left: new PunchDetector("left", this.options.punch), right: new PunchDetector("right", this.options.punch) };
    this.state = idleState(slot);
  }

  get current(): MoveState {
    return this.state;
  }

  get calibration(): Baseline | null {
    return this.baseline;
  }

  setBaseline(baseline: Baseline | null): void {
    this.baseline = baseline;
    this.reference = baseline ? new StandingReference(baseline) : null;
    this.resetDetectors();
    this.state = { ...this.state, calibrated: !!baseline, lane: 0 };
  }

  configure(tuning: MoveTuning): void {
    this.options = tune(this.options, tuning);
    this.jump.configure(this.options.jump);
    this.duck.configure(this.options.duck);
    this.lean.configure(this.options.lean);
    this.guard.configure(this.options.guard);
    this.lane.configure(this.options.lane);
    this.punches.left.configure(this.options.punch);
    this.punches.right.configure(this.options.punch);
  }

  update(body: Body | null, time: number): MoveEvent[] {
    const events: MoveEvent[] = [];
    const say = (event: DistributiveOmit<MoveEvent, "slot" | "time">) => events.push({ ...event, slot: this.slot, time } as MoveEvent);
    if (!body) {
      if (this.state.present) say({ type: "away" });
      this.resetDetectors();
      // The lane is kept, so a player who steps out of view and back is still in it.
      this.state = { ...idleState(this.slot, !!this.baseline), lane: this.state.lane };
      this.lastTime = null;
      return events;
    }
    if (!this.state.present) say({ type: "back" });
    const step = this.lastTime === null ? 0 : time - this.lastTime;
    this.lastTime = time;
    const scale = this.reference?.scale ?? body.scale;
    const next = { ...idleState(this.slot, !!this.baseline), present: true, lane: this.state.lane };

    const guard = this.guard.update(body, scale);
    if (guard.changed) say({ type: "guard", up: guard.active });
    next.guard = guard.active;
    next.confidence.guard = guard.confidence;

    for (const hand of ["left", "right"] as const) {
      const punch = this.punches[hand].update(body, this.baseline?.armLength ?? DEFAULT_ARM);
      if (punch) say({ type: "punch", ...punch });
    }

    const lean = this.lean.update(body, scale, this.baseline?.headOffset ?? 0);
    if (lean.changed) say({ type: "lean", side: lean.side });
    next.lean = lean.side;
    next.confidence.lean = lean.confidence;
    next.amounts.lean = lean.amount;

    if (this.baseline && this.reference) {
      const jump = this.jump.update(body, this.reference);
      if (jump.started) say({ type: "jump", confidence: jump.confidence });
      if (jump.landed) say({ type: "land" });
      const duck = this.duck.update(body, this.reference);
      if (duck.started) say({ type: "duck", confidence: duck.confidence });
      if (duck.ended) say({ type: "stand" });
      const lane = this.lane.update(body, this.baseline, this.reference.nearness);
      if (lane.changed) say({ type: "lane", lane: lane.lane, from: this.state.lane });
      Object.assign(next, { jumping: jump.active, ducking: duck.active, lane: lane.lane, offset: lane.offset });
      next.confidence = { ...next.confidence, jump: jump.confidence, duck: duck.confidence, lane: lane.confidence };
      next.amounts = { ...next.amounts, rise: jump.amount, drop: duck.amount };
      const { followMs, resizeAt, restSpeed } = this.options.reference;
      const calm = Math.hypot(body.velocity.torso.x, body.velocity.torso.y) < restSpeed;
      this.reference.follow(body, calm && !jump.active && !duck.active, step, followMs, resizeAt);
    }
    this.state = next;
    return events;
  }

  private resetDetectors(): void {
    this.jump.reset();
    this.duck.reset();
    this.lean.reset();
    this.guard.reset();
    this.punches.left.reset();
    this.punches.right.reset();
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
