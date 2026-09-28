import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { HostPad } from "@/games/kit/pad/host-pad";
import { adminFoul, adminSetPiece } from "../engine/admin";
import { FixedStepClock } from "../engine/clock";
import type { MatchEvent } from "../engine/events";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import type { Command, MatchState } from "../engine/types";
import { buildView, type MatchView } from "../engine/view";
import { BUTTONS } from "../protocol";
import { ReplayRecorder } from "./replay";
import { testHooks } from "./test-hooks";

interface Press {
  button: string;
  down: boolean;
  x: number;
  y: number;
  /** For a release of Shoot/Pass, how long the phone saw it held. */
  held?: number;
}

/**
 * Runs one match for the host: fixed steps from the animation clock,
 * phones' sticks and buttons turned into commands, and the last few
 * seconds kept for the goal replay.
 */
export class MatchDriver {
  readonly state: MatchState;
  readonly replay = new ReplayRecorder();
  readonly athleteBySeat = new Map<number, number>();
  view: MatchView;
  private readonly clock: FixedStepClock;
  private readonly presses = new Map<number, Press[]>();
  private readonly held = new Map<number, number>();
  private pending: MatchEvent[] = [];

  constructor(readonly entrants: readonly Entrant[], seed: number, level: BotLevel = DEFAULT_BOT_LEVEL) {
    const hooks = testHooks();
    this.clock = new FixedStepClock(hooks.catchUp);
    this.state = createMatch(entrants, { seed, level, ...(hooks.seconds ? { seconds: hooks.seconds } : {}), ...(hooks.goalsToWin ? { goalsToWin: hooks.goalsToWin } : {}) });
    for (const a of this.state.athletes) if (a.seat !== null) this.athleteBySeat.set(a.seat, a.id);
    this.view = buildView(this.state);
  }

  /** A button went down or up on a phone. Applied on the next step, so none is ever lost. */
  press(seat: number, button: string, down: boolean, x: number, y: number): void {
    if (!this.athleteBySeat.has(seat)) return;
    const list = this.presses.get(seat) ?? [];
    const held = !down && button === BUTTONS.shoot ? this.held.get(seat) : undefined;
    if (!down) this.held.delete(seat);
    list.push({ button, down, x, y, ...(held !== undefined ? { held } : {}) });
    this.presses.set(seat, list);
  }

  /** The phone's own measure of a Shoot/Pass hold, which comes just before its release. */
  noteHeld(seat: number, seconds: number): void {
    if (this.athleteBySeat.has(seat)) this.held.set(seat, seconds);
  }

  /** Admin panel shortcuts. Each returns whether it could be done right now. */
  foul(): boolean {
    return this.admin(() => adminFoul(this.state));
  }

  setPiece(kind: "free" | "penalty"): boolean {
    return this.admin(() => adminSetPiece(this.state, kind));
  }

  /** The events a shortcut raises are kept for the next tick, so the whistle and the camera hear them. */
  private admin(run: () => boolean): boolean {
    this.state.events = [];
    const done = run();
    this.pending.push(...this.state.events);
    this.view = buildView(this.state);
    return done;
  }

  /** A phone left or came back. While away, a computer plays for them. */
  setOnline(seat: number, online: boolean): void {
    const id = this.athleteBySeat.get(seat);
    if (id !== undefined) this.state.athletes[id]!.online = online;
  }

  /** Runs the steps due by `nowMs` and returns what happened. */
  tick(nowMs: number, pad: HostPad): MatchEvent[] {
    const events: MatchEvent[] = this.pending;
    this.pending = [];
    const steps = this.clock.stepsFor(nowMs);
    for (let i = 0; i < steps; i++) {
      stepMatch(this.state, this.commands(pad, nowMs));
      events.push(...this.state.events);
      for (const event of this.state.events) if (event.type === "goal") this.replay.markGoal(this.state.time);
      if (this.replay.wants(this.state.time)) this.replay.record(buildView(this.state));
    }
    this.view = buildView(this.state);
    return events;
  }

  /**
   * The stick is relative to the screen: the camera looks across the
   * pitch from the near side, so right is +x and up is toward the far
   * side, -z.
   */
  private commands(pad: HostPad, nowMs: number): Map<number, Command> {
    const out = new Map<number, Command>();
    for (const [seat, id] of this.athleteBySeat) {
      const stick = pad.stick(seat, nowMs);
      // Guard is held rather than pressed, so it is read as a level every step.
      const command: Command = { move: { x: stick.x, z: -stick.y }, guard: pad.isHeld(seat, BUTTONS.guard) };
      const queued = this.presses.get(seat);
      // One press per step keeps a quick tap's down and up in order.
      const next = queued?.shift();
      if (next) {
        const aim = { x: next.x, z: -next.y };
        if (next.button === BUTTONS.shoot) {
          if (next.down) command.shootDown = true;
          else command.shootUp = true;
          command.aim = aim;
          if (next.held !== undefined) command.held = next.held;
        } else if (next.button === BUTTONS.slide && next.down) {
          command.slide = true;
          if (Math.hypot(aim.x, aim.z) > 0.2) command.move = aim;
        } else if (next.button === BUTTONS.steal && next.down) command.steal = true;
        else if (next.button === BUTTONS.jump && next.down) command.jump = true;
      }
      out.set(id, command);
    }
    return out;
  }
}
