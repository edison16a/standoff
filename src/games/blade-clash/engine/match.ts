import { perSlot, type PerSlot, type Slot } from "@/games/blade-clash/players";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import { COUNTDOWN_SECONDS, FINISH_MS, POINT_MS, POINTS_TO_WIN } from "./rules";

/**
 * The match as a timed state machine: the score, the winner, and when each
 * phase hands over to the next. It knows nothing about swords. The engine
 * tells it about hits and reacts to the phase changes `update` reports.
 */
export class Match {
  phase: MatchPhase = "lobby";
  phaseStartedAt = 0;
  score: PerSlot<number> = perSlot(() => 0);
  /** Who scored the latest point, for the hit moment's names. */
  scorer: Slot | null = null;
  rematchVotes: PerSlot<boolean> = perSlot(() => false);
  winner: Slot | null = null;

  /** No points each and straight into the countdown. */
  start(now: number): void {
    this.score = perSlot(() => 0);
    this.scorer = null;
    this.winner = null;
    this.rematchVotes = perSlot(() => false);
    this.enter("countdown", now);
  }

  /** Whole seconds left before the fight, or null outside the countdown. */
  countdown(now: number): number | null {
    if (this.phase !== "countdown") return null;
    return Math.max(0, Math.ceil(COUNTDOWN_SECONDS - this.elapsed(now) / 1000));
  }

  /** Milliseconds into the current phase. */
  elapsed(now: number): number {
    return now - this.phaseStartedAt;
  }

  /**
   * A point to `attacker`. Play stops for the hit moment, or ends when
   * that was the winning point. Returns true for the winning point.
   */
  point(attacker: Slot, now: number): boolean {
    if (this.phase !== "live") return false;
    this.score[attacker] += 1;
    this.scorer = attacker;
    if (this.score[attacker] < POINTS_TO_WIN) {
      this.enter("point", now);
      return false;
    }
    this.winner = attacker;
    this.enter("finish", now);
    return true;
  }

  /** Records a rematch vote. Returns true once both players want one. */
  voteRematch(slot: Slot): boolean {
    if (this.phase !== "matchOver") return false;
    this.rematchVotes[slot] = true;
    return this.rematchVotes[1] && this.rematchVotes[2];
  }

  pause(now: number): void {
    if (this.phase !== "countdown" && this.phase !== "live" && this.phase !== "point") return;
    this.enter("paused", now);
  }

  /** Coming back from a pause counts down again, with the score as it was. */
  resume(now: number): void {
    if (this.phase !== "paused") return;
    this.enter("countdown", now);
  }

  /** Advances time. Returns the phase just entered, if any, so the engine can react. */
  update(now: number): MatchPhase | null {
    const elapsed = this.elapsed(now);
    if (this.phase === "countdown" && elapsed >= COUNTDOWN_SECONDS * 1000) return this.enter("live", now);
    if (this.phase === "point" && elapsed >= POINT_MS) return this.enter("live", now);
    if (this.phase === "finish" && elapsed >= FINISH_MS) return this.enter("matchOver", now);
    return null;
  }

  private enter(phase: MatchPhase, now: number): MatchPhase {
    this.phase = phase;
    this.phaseStartedAt = now;
    return phase;
  }
}
