import type { Stick } from "@/games/kit/pad/stick-math";
import { PadInput } from "../engine/input";
import { createMatch, setBot, stepMatch, type Entrant } from "../engine/match";
import { STEP } from "../engine/tuning";
import type { Command, MatchOptions, MatchState } from "../engine/types";
import { BUTTONS } from "../protocol";

/** A frame longer than this is a stall; the match does not try to catch up past it. */
const MAX_FRAME = 0.1;

/** Called round every engine step, so the renderer can blend and the host can hear events. */
export interface StepHooks {
  before?(): void;
  after?(state: MatchState): void;
}

/**
 * Runs one match on the host: keeps a pad per phone, steps the engine at
 * a fixed 60 a second from however fast the screen draws, and can slow
 * time for a dramatic moment. Phones that drop are played by a bot until
 * they come back.
 */
export class MatchDriver {
  readonly state: MatchState;
  readonly fighterBySeat = new Map<number, number>();
  private readonly pads = new Map<number, PadInput>();
  private carry = 0;
  private slowLeft = 0;
  private slowScale = 1;

  constructor(entrants: readonly Entrant[], options: Partial<MatchOptions>) {
    this.state = createMatch(entrants, options);
    for (const f of this.state.fighters) {
      if (f.seat === null) continue;
      this.fighterBySeat.set(f.seat, f.id);
      this.pads.set(f.seat, new PadInput());
    }
  }

  /** How far the clock is between the last step and the next, for smooth drawing. */
  get alpha(): number {
    return Math.min(1, this.carry / STEP);
  }

  /** A phone button went down or up. */
  press(seat: number, button: string, down: boolean): void {
    const pad = this.pads.get(seat);
    if (!pad) return;
    if (button === BUTTONS.up) {
      if (down) pad.upPressed();
      else pad.upReleased();
      return;
    }
    if (!down) return;
    if (button === BUTTONS.attack) pad.press("light");
    else if (button === BUTTONS.special) pad.press("heavy");
    else if (button === BUTTONS.ult) pad.press("ult");
  }

  /** A phone dropped or came back: a bot plays for them meanwhile. */
  setOnline(seat: number, online: boolean): void {
    const id = this.fighterBySeat.get(seat);
    if (id === undefined) return;
    setBot(this.state, id, !online);
    this.pads.get(seat)?.reset();
  }

  /** Slows the match for a moment, like the last KO. */
  slowMo(scale: number, seconds: number): void {
    this.slowScale = scale;
    this.slowLeft = seconds;
  }

  /** Steps the match through a real frame and returns the game time that passed. */
  advance(realDt: number, stickOf: (seat: number) => Stick, hooks: StepHooks = {}): number {
    const frame = Math.min(MAX_FRAME, Math.max(0, realDt));
    const scale = this.slowLeft > 0 ? this.slowScale : 1;
    this.slowLeft = Math.max(0, this.slowLeft - frame);
    const dt = frame * scale;
    this.carry += dt;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      hooks.before?.();
      stepMatch(this.state, this.commands(stickOf));
      hooks.after?.(this.state);
    }
    return dt;
  }

  private commands(stickOf: (seat: number) => Stick): Map<number, Command> {
    const out = new Map<number, Command>();
    for (const [seat, id] of this.fighterBySeat) {
      const stick = stickOf(seat);
      out.set(id, this.pads.get(seat)!.read(stick.x, stick.y));
    }
    return out;
  }
}
