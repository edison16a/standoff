import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { adminFieldGoal, adminTouchdown, adminTwoPoint, adminWin } from "../engine/admin";
import type { MatchEvent } from "../engine/events";
import type { Entry } from "../engine/lineup";
import { Match } from "../engine/match";
import { RULES, STEP } from "../engine/tuning";
import type { Button } from "../engine/types";
import type { V2 } from "../engine/vec";
import { buildView, type MatchView } from "../engine/view";
import type { Call } from "../protocol";
import { ReplayRecorder } from "./replay/recorder";
import { StepClock } from "./step-clock";
import { stickToField, type Stick } from "./steer";
import { testHooks } from "./test-hooks";

/** What the driver reads from the phones each step, already on the screen's axes. */
export interface Sticks {
  move(seat: number): Stick;
  /** The throw stick while it is held, or null. */
  aim(seat: number): Stick | null;
  /** The way up the screen on the ground, from the camera. */
  forward: V2;
}

/**
 * Runs one game for the host: fixed steps from the animation clock, each
 * phone's sticks turned into field directions for the camera, presses
 * and picks passed to the match, and every step kept for the touchdown
 * replay. After a touchdown it stops at the end of the celebration and
 * waits, so the replay plays before the try.
 */
export class MatchDriver {
  readonly match: Match;
  readonly recorder = new ReplayRecorder();
  readonly idBySeat = new Map<number, number>();
  view: MatchView;
  /** The touchdown waiting for its replay, and whether the match is held for it. */
  replayFor: number | null = null;
  held = false;
  private readonly clock: StepClock;

  constructor(entries: readonly Entry[], seed: number, level: BotLevel) {
    const hooks = testHooks();
    this.clock = new StepClock(hooks.catchUp ?? 8);
    this.match = new Match({ entries, seed, level, target: hooks.target, quarterSeconds: hooks.quarterSeconds });
    for (const a of this.match.athletes) if (a.seat !== null) this.idBySeat.set(a.seat, a.id);
    this.view = buildView(this.match);
  }

  /** The athlete a phone steers now: its own, or the computer teammate it passed to this play. */
  private id(seat: number): number | null {
    return this.idBySeat.has(seat) ? (this.match.steered(seat)?.id ?? null) : null;
  }

  /** A button went down or up. The stick at that instant goes first, so a juke reads the right way. */
  press(seat: number, button: Button, down: boolean, stick: Stick, forward: V2): void {
    const id = this.id(seat);
    if (id === null || this.held) return;
    this.match.setMove(id, stickToField(stick, forward));
    if (down) this.match.press(id, button);
    else this.match.release(id, button);
  }

  call(seat: number, call: Call): void {
    const id = this.id(seat);
    if (id !== null && !this.held) this.match.choose(id, call);
  }

  /** A tap on the kick meter, with the phone's own reading. */
  kick(seat: number, value: number): void {
    const id = this.id(seat);
    if (id !== null && !this.held) this.match.press(id, "kick", value);
  }

  /** The throw stick let go: aim one last time, then throw. */
  throwAt(seat: number, stick: Stick, forward: V2): void {
    const id = this.id(seat);
    if (id === null || this.held) return;
    this.match.setAim(id, stickToField(stick, forward));
    this.match.setAim(id, null);
  }

  /** A phone left or came back. While away, the computer plays for them. */
  setOnline(seat: number, online: boolean): void {
    const id = this.idBySeat.get(seat);
    if (id !== undefined) this.match.setAuto(id, !online);
  }

  /** Admin panel shortcuts, for the team with the ball. Their events come out on the next tick. */
  admin(kind: "touchdown" | "fieldGoal" | "twoPoint" | "win"): void {
    if (this.held) return;
    const team = this.match.offense;
    if (kind === "touchdown") adminTouchdown(this.match, team);
    else if (kind === "fieldGoal") adminFieldGoal(this.match, team);
    else if (kind === "win") adminWin(this.match, team);
    else adminTwoPoint(this.match, team);
    this.view = buildView(this.match);
  }

  /** Runs the steps due by `nowMs` and returns what happened. Stops at the replay point after a touchdown. */
  tick(nowMs: number, sticks: Sticks): MatchEvent[] {
    const events: MatchEvent[] = this.match.drainEvents();
    this.notice(events);
    if (this.held) return events;
    const steps = this.clock.stepsFor(nowMs);
    for (let i = 0; i < steps; i++) {
      if (this.replayDue()) {
        this.held = true;
        break;
      }
      this.steer(sticks);
      this.match.step(STEP);
      const fresh = this.match.drainEvents();
      this.notice(fresh);
      events.push(...fresh);
      this.recorder.record(buildView(this.match));
    }
    this.view = buildView(this.match);
    return events;
  }

  /** The replay has played, or everyone skipped it: on to the try. */
  resume(): void {
    this.held = false;
    this.replayFor = null;
    this.clock.reset();
  }

  private notice(events: readonly MatchEvent[]): void {
    for (const e of events) if (e.type === "touchdown" && !e.conversion) this.replayFor = e.id;
  }

  /** The celebration is over and a replay is owed: hold here. */
  private replayDue(): boolean {
    const m = this.match;
    return this.replayFor !== null && m.phase === "touchdown" && m.phaseT + STEP >= RULES.touchdownSeconds;
  }

  private steer(sticks: Sticks): void {
    for (const seat of this.idBySeat.keys()) {
      const id = this.id(seat);
      if (id === null) continue;
      this.match.setMove(id, stickToField(sticks.move(seat), sticks.forward));
      const aim = sticks.aim(seat);
      if (aim) this.match.setAim(id, stickToField(aim, sticks.forward));
    }
  }
}
