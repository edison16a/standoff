import { perSlot, type PerSlot, type Slot } from "@/shared/players";
import { TOUCHES_TO_WIN, type MatchPhase } from "@/shared/protocol";
import { EN_GARDE_SECONDS, HALT_MS, SHORT_HALT_MS } from "./rules";

/** Why play stopped. Only a touch scores. */
export type HaltReason = { kind: "touch"; scorer: Slot } | { kind: "double" } | { kind: "corps" };

/** The referee's call, as short as a real one. Left is player one. */
const CALLS: Record<HaltReason["kind"], (reason: HaltReason) => string> = {
  touch: (reason) => (reason.kind === "touch" && reason.scorer === 2 ? "Touch right" : "Touch left"),
  double: () => "Double",
  corps: () => "Corps-à-corps",
};

/**
 * The match as a timed state machine: scores, whose turn it is to do
 * what, and when each phase should hand over to the next. It does not
 * know about fencers or sensors. The engine asks it what phase we are in
 * and reacts to the phase changes `update` reports.
 */
export class Match {
  phase: MatchPhase = "lobby";
  phaseStartedAt = 0;
  scores: PerSlot<number> = perSlot(() => 0);
  rematchVotes: PerSlot<boolean> = perSlot(() => false);
  winner: Slot | null = null;
  call: string | null = null;
  haltReason: HaltReason | null = null;

  /** Fresh scores and straight into the first countdown. */
  start(now: number): void {
    this.scores = perSlot(() => 0);
    this.winner = null;
    this.rematchVotes = perSlot(() => false);
    this.call = null;
    this.enter("enGarde", now);
  }

  /** Whole seconds left before "allez", or null outside the countdown. */
  countdown(now: number): number | null {
    if (this.phase !== "enGarde") return null;
    return Math.max(0, Math.ceil(EN_GARDE_SECONDS - (now - this.phaseStartedAt) / 1000));
  }

  /** Stops the exchange. A touch is scored right away so the HUD updates. */
  halt(reason: HaltReason, now: number): void {
    this.haltReason = reason;
    this.call = CALLS[reason.kind](reason);
    if (reason.kind === "touch") {
      this.scores[reason.scorer] += 1;
      if (this.scores[reason.scorer] >= TOUCHES_TO_WIN) this.winner = reason.scorer;
    }
    this.enter("halt", now);
  }

  /** True if this touch would end the match, used to pick a bigger cheer. */
  isMatchPoint(scorer: Slot): boolean {
    return this.scores[scorer] + 1 >= TOUCHES_TO_WIN;
  }

  /** Records a rematch vote. Returns true once both players want one. */
  voteRematch(slot: Slot): boolean {
    if (this.phase !== "matchOver") return false;
    this.rematchVotes[slot] = true;
    return this.rematchVotes[1] && this.rematchVotes[2];
  }

  pause(now: number): void {
    if (this.phase !== "enGarde" && this.phase !== "live") return;
    this.enter("paused", now);
  }

  /** Coming back from a pause always restarts the exchange from the countdown. */
  resume(now: number): void {
    if (this.phase !== "paused") return;
    this.enter("enGarde", now);
  }

  /**
   * Advances time. Returns the phase we just entered, if any, so the
   * engine can do the side effects (recenter phones, crown a winner).
   */
  update(now: number): MatchPhase | null {
    const elapsed = now - this.phaseStartedAt;
    if (this.phase === "enGarde") return elapsed >= EN_GARDE_SECONDS * 1000 ? this.enter("live", now) : null;
    if (this.phase !== "halt") return null;
    const touch = this.haltReason?.kind === "touch";
    if (elapsed < (touch ? HALT_MS : SHORT_HALT_MS)) return null;
    return this.enter(this.winner ? "matchOver" : "enGarde", now);
  }

  private enter(phase: MatchPhase, now: number): MatchPhase {
    this.phase = phase;
    this.phaseStartedAt = now;
    if (phase === "enGarde") this.call = null;
    return phase;
  }
}
