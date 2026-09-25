import { ComputerBoxer } from "../engine/ai";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { seeded } from "../engine/random";
import { styleFor, type DefenseInput, type FighterId, type Hand, type Level } from "../engine/types";
import { REPLAY_LENGTH } from "../render/replay";

/** The knockout replay, then a moment before the results. */
const REPLAY_MS = REPLAY_LENGTH + 600;

/** The match is stepped in slices this long, whatever the frame rate. */
const STEP_MS = 10;
/** After a long stall, at most this much is caught up in one go. */
const MAX_CATCH_UP_MS = 250;
/** After a decision, a moment on the winner before the results. */
const CELEBRATE_MS = 3_500;
/** A player back in view gets this long to set themselves before the fight goes on. */
const RESUME_MS = 1_500;

export type Stage = "fight" | "replay" | "celebrate" | "results";

export interface DriverOptions {
  seed: number;
  /** For each boxer, the camera slot of the player driving it, or null for the computer. */
  slots: readonly [number | null, number | null];
  roundMs?: number;
  introMs?: number;
  /** Each boxer's footwork style, by the id of the boxer chosen. */
  styles?: readonly [string, string];
  /** Touch gloves before each round, on unless a test turns it off. */
  touch?: boolean;
}

/**
 * Runs one fight: steps the match in fixed slices, feeds it the players'
 * defence and punches and the computer boxer's decisions, pauses while a
 * player is out of view, and walks through the knockout replay to the
 * results. Everything that happens goes out to listeners as match events.
 */
export class FightDriver {
  readonly match: Match;
  readonly slots: readonly [number | null, number | null];
  readonly computer: ComputerBoxer | null;
  stage: Stage = "fight";
  /** When the current stage began, on the page clock. */
  stageSince = 0;
  /** Why the fight is paused, or null while it runs. */
  pausedFor: number[] = [];
  private resumeAt: number | null = null;
  private last: number | null = null;
  private carry = 0;
  private readonly listeners = new Set<(event: MatchEvent) => void>();

  constructor(options: DriverOptions) {
    this.match = new Match({ seed: options.seed, roundMs: options.roundMs, introMs: options.introMs, styles: options.styles, touch: options.touch });
    this.slots = options.slots;
    const cpu = options.slots.findIndex((slot) => slot === null);
    this.computer = cpu >= 0 ? new ComputerBoxer(cpu as FighterId, seeded(options.seed * 7 + 3)) : null;
  }

  listen(listener: (event: MatchEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Which boxer a camera slot drives. */
  fighterFor(slot: number): FighterId | null {
    const index = this.slots.indexOf(slot);
    return index >= 0 ? (index as FighterId) : null;
  }

  get paused(): boolean {
    return this.match.paused;
  }

  /** The fight is live and a punch from a player would count. */
  get live(): boolean {
    return this.stage === "fight" && !this.match.paused && this.match.phase === "fight";
  }

  defend(slot: number, input: DefenseInput): void {
    const id = this.fighterFor(slot);
    if (id !== null) this.match.setInput(id, input);
  }

  punch(slot: number, hand: Hand, straight: boolean, power: number, level: Level = "head"): boolean {
    const id = this.fighterFor(slot);
    if (id === null || !this.live) return false;
    const thrown = this.match.throwPunch(id, hand, styleFor(hand, straight), power, 0, level);
    if (thrown) this.flush();
    return thrown;
  }

  /** A player stepped out of view or came back. The fight waits for everyone. */
  setPresent(slot: number, present: boolean, now: number): void {
    if (this.fighterFor(slot) === null) return;
    if (this.stage !== "fight" || this.match.phase === "over") {
      // Once the fight is decided players are free to walk off, and nothing waits for them.
      this.pausedFor = [];
      this.resumeAt = null;
      this.match.paused = false;
      return;
    }
    const away = new Set(this.pausedFor);
    if (present) away.delete(slot);
    else away.add(slot);
    this.pausedFor = [...away].sort();
    if (this.pausedFor.length > 0) {
      this.match.paused = true;
      this.resumeAt = null;
    } else if (this.match.paused && this.resumeAt === null) {
      // Everyone is back: a moment to set themselves, counted from the first frame they were all seen.
      this.resumeAt = now + RESUME_MS;
    }
  }

  /** Seconds until a paused fight goes on, or null. */
  resumingIn(now: number): number | null {
    return this.resumeAt === null ? null : Math.max(0, (this.resumeAt - now) / 1000);
  }

  tick(now: number): void {
    if (this.last === null) {
      this.last = now;
      this.stageSince = now;
    }
    const elapsed = Math.min(MAX_CATCH_UP_MS, now - this.last);
    this.last = now;
    if (this.resumeAt !== null && now >= this.resumeAt) {
      this.resumeAt = null;
      this.match.paused = false;
    }
    if (this.stage === "replay" && now - this.stageSince >= REPLAY_MS) this.setStage("results", now);
    if (this.stage === "celebrate" && now - this.stageSince >= CELEBRATE_MS) this.setStage("results", now);
    this.carry += elapsed;
    while (this.carry >= STEP_MS) {
      this.carry -= STEP_MS;
      this.computer?.update(this.match);
      this.dispatch(this.match.update(STEP_MS), now);
    }
  }

  /** Skips the replay or the celebration, straight to the results. */
  skip(now: number): void {
    if (this.stage === "replay" || this.stage === "celebrate") this.setStage("results", now);
  }

  /** Sends out anything the match has queued now, as a player's punch starting. */
  private flush(): void {
    this.dispatch(this.match.update(0), this.last ?? 0);
  }

  private dispatch(events: MatchEvent[], now: number): void {
    for (const event of events) {
      this.computer?.hear(event, this.match);
      for (const listener of this.listeners) listener(event);
      if (event.type === "over") {
        const stoppage = event.result.method === "KO" || event.result.method === "TKO";
        this.setStage(stoppage ? "replay" : "celebrate", now);
      }
    }
  }

  private setStage(stage: Stage, now: number): void {
    this.stage = stage;
    this.stageSince = now;
  }
}
