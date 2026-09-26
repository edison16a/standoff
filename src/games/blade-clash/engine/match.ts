import { otherSlot, perSlot, type PerSlot, type Slot } from "@/games/blade-clash/players";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import { COUNTDOWN_SECONDS, FINISH_MS, MAX_HEALTH } from "./rules";

/**
 * The match as a timed state machine: health, the winner, and when each
 * phase hands over to the next. It knows nothing about swords. The engine
 * tells it about hits and reacts to the phase changes `update` reports.
 */
export class Match {
  phase: MatchPhase = "lobby";
  phaseStartedAt = 0;
  health: PerSlot<number> = perSlot(() => MAX_HEALTH);
  rematchVotes: PerSlot<boolean> = perSlot(() => false);
  winner: Slot | null = null;

  /** Full health and straight into the countdown. */
  start(now: number): void {
    this.health = perSlot(() => MAX_HEALTH);
    this.winner = null;
    this.rematchVotes = perSlot(() => false);
    this.enter("countdown", now);
  }

  /** Whole seconds left before the fight, or null outside the countdown. */
  countdown(now: number): number | null {
    if (this.phase !== "countdown") return null;
    return Math.max(0, Math.ceil(COUNTDOWN_SECONDS - (now - this.phaseStartedAt) / 1000));
  }

  /** Takes one health from `victim`. Returns true when that was their last, which ends the fight. */
  hurt(victim: Slot, now: number): boolean {
    if (this.phase !== "live") return false;
    this.health[victim] = Math.max(0, this.health[victim] - 1);
    if (this.health[victim] > 0) return false;
    this.winner = otherSlot(victim);
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
    if (this.phase !== "countdown" && this.phase !== "live") return;
    this.enter("paused", now);
  }

  /** Coming back from a pause counts down again, with health as it was. */
  resume(now: number): void {
    if (this.phase !== "paused") return;
    this.enter("countdown", now);
  }

  /** Advances time. Returns the phase just entered, if any, so the engine can react. */
  update(now: number): MatchPhase | null {
    const elapsed = now - this.phaseStartedAt;
    if (this.phase === "countdown" && elapsed >= COUNTDOWN_SECONDS * 1000) return this.enter("live", now);
    if (this.phase === "finish" && elapsed >= FINISH_MS) return this.enter("matchOver", now);
    return null;
  }

  private enter(phase: MatchPhase, now: number): MatchPhase {
    this.phase = phase;
    this.phaseStartedAt = now;
    return phase;
  }
}
