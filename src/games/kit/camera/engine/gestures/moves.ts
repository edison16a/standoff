import type { Body, Hand } from "../body";
import type { Baseline } from "../calibration";
import { ramp } from "../geometry";
import { GuardDetector } from "./guard";
import { HeadLine } from "./head-line";
import { HeadMoveDetector } from "./head-moves";
import { LaneTracker } from "./lane";
import { LeanDetector } from "./lean";
import { idleState, type MoveEvent, type MoveState } from "./move-types";
import { DEFAULT_MOVES, tune, type MoveOptions, type MoveTuning } from "./options";
import { PunchDetector } from "./punch";

export { idleState, type MoveEvent, type MoveState } from "./move-types";

const DEFAULT_ARM = 1.1;

type Say = (event: DistributiveOmit<MoveEvent, "slot" | "time">) => void;

/**
 * Reads every move for one player from their body, frame by frame. Pure:
 * it only needs bodies with times, so tests drive it with made up poses.
 */
export class MoveReader {
  private options: MoveOptions;
  private baseline: Baseline | null = null;
  private line: HeadLine | null = null;
  private readonly head: HeadMoveDetector;
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
    this.head = new HeadMoveDetector(this.options.head);
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
    this.line = baseline ? new HeadLine(baseline) : null;
    this.resetDetectors();
    this.lane.reset();
    this.state = { ...this.state, calibrated: !!baseline, lane: 0 };
  }

  configure(tuning: MoveTuning): void {
    this.options = tune(this.options, tuning);
    this.head.configure(this.options.head);
    this.lean.configure(this.options.lean);
    this.guard.configure(this.options.guard);
    this.lane.configure(this.options.lane);
    this.punches.left.configure(this.options.punch);
    this.punches.right.configure(this.options.punch);
  }

  update(body: Body | null, time: number): MoveEvent[] {
    const events: MoveEvent[] = [];
    const say: Say = (event) => events.push({ ...event, slot: this.slot, time } as MoveEvent);
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
    const next = { ...idleState(this.slot, !!this.baseline), present: true, lane: this.state.lane };
    this.readArms(body, next, say);
    if (this.line) this.readHead(body, this.line, time, step, next, say);
    this.state = next;
    return events;
  }

  /** Guard, punches and leans, which need no head line. */
  private readArms(body: Body, next: MoveState, say: Say): void {
    const scale = this.baseline?.scale ?? body.scale;
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
  }

  /** Jumps, ducks and lanes, all from where the head is against its line. */
  private readHead(body: Body, line: HeadLine, time: number, step: number, next: MoveState, say: Say): void {
    const { up, down } = this.options.head;
    let at = line.measure(body);
    const moves = this.head.update(at.rise, time);
    const seen = ramp(body.confidence, 0.4, 0.8);
    if (moves.jumped) say({ type: "jump", confidence: ramp(at.rise, up / 2, up * 1.5) * seen });
    if (moves.landed) say({ type: "land" });
    if (moves.ducked) say({ type: "duck", confidence: ramp(-at.rise, down / 2, down * 1.5) * seen });
    if (moves.stood) say({ type: "stand" });
    if (moves.settled) {
      // The player stood up or sat down. Their new resting height is the line from now on.
      line.settle(body);
      at = line.measure(body);
    }
    const lane = this.lane.update(at.side, body.confidence);
    if (lane.changed) say({ type: "lane", lane: lane.lane, from: this.state.lane });
    next.lane = lane.lane;
    next.head = { rise: at.rise, side: at.side };
    next.jumping = moves.jumping;
    next.ducking = moves.ducking;
    next.confidence.lane = lane.confidence;
    next.confidence.jump = ramp(at.rise, up / 2, up * 1.5) * seen;
    next.confidence.duck = ramp(-at.rise, down / 2, down * 1.5) * seen;
    next.amounts.rise = Math.max(0, at.rise);
    next.amounts.drop = Math.max(0, -at.rise);
    next.line = line.view(body, up, down);
    // The line follows only a player at rest, never during a move.
    const calm = Math.hypot(body.velocity.head.x, body.velocity.head.y) < this.options.line.restSpeed;
    if (moves.idle && calm) line.follow(body, step, this.options.line);
  }

  private resetDetectors(): void {
    this.head.reset();
    this.lean.reset();
    this.guard.reset();
    this.punches.left.reset();
    this.punches.right.reset();
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
