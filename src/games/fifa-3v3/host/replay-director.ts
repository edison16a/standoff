import type { ReplayCard, SkipView } from "./host-store";
import type { MatchDriver } from "./match-driver";
import type { ReplayFrame } from "./replay";
import { SkipVotes } from "./replay-skip";

/** A beat of the last still before cutting back to the kick off. */
const TAIL = 0.3;

/**
 * Runs the goal replay on the big screen. When the match enters its
 * replay phase it cuts the clip; it plays it through, stage by stage,
 * and ends it when it is done or when every player has pressed a button
 * to skip. It also says what the overlay shows: the stage's numbers and
 * who has voted to skip.
 */
export class ReplayDirector {
  readonly votes = new SkipVotes();
  active = false;

  /** Called every tick. Returns true when the replay started or ended, so the screens refresh. */
  update(driver: MatchDriver): boolean {
    const inReplay = driver.state.phase === "replay";
    if (inReplay && !this.active) {
      this.active = driver.replay.cut();
      // Nothing to show: straight on to the kick off.
      if (!this.active) driver.endReplay();
      else this.votes.start(playingSeats(driver));
      return true;
    }
    if (!inReplay) {
      if (!this.active) return false;
      this.stop();
      return true;
    }
    if (driver.state.phaseT < driver.replay.length + TAIL) return false;
    this.finish(driver);
    return true;
  }

  /** What the replay shows right now, or null outside one. */
  frame(driver: MatchDriver): ReplayFrame | null {
    return this.active ? driver.replay.at(driver.state.phaseT) : null;
  }

  /** A button on a phone during the replay. Returns true when the vote changed anything. */
  vote(driver: MatchDriver, seat: number): boolean {
    if (!this.active || this.votes.has(seat)) return false;
    if (this.votes.vote(seat)) this.finish(driver);
    return true;
  }

  /** A phone left mid replay: the others no longer wait for it. */
  left(driver: MatchDriver, seat: number): void {
    if (this.active && this.votes.setPresent(seat, false)) this.finish(driver);
  }

  /** The overlay: the stage and its numbers. */
  card(driver: MatchDriver, nameOf: (id: number) => string): ReplayCard | null {
    const script = driver.replay.script;
    const frame = this.frame(driver);
    if (!this.active || !script || !frame) return null;
    const stage = frame.segment.stage;
    return { stage, kicker: script.kicker !== null ? nameOf(script.kicker) : null, facts: script.facts, slow: frame.segment.rate < 0.5 };
  }

  /** Who may skip, and who has. */
  skipList(nameOf: (seat: number) => string): SkipView[] {
    if (!this.active) return [];
    return this.votes.list().map((v) => ({ ...v, name: nameOf(v.seat) }));
  }

  stop(): void {
    this.active = false;
    this.votes.clear();
  }

  private finish(driver: MatchDriver): void {
    this.stop();
    driver.endReplay();
  }
}

/** The phones playing in the match right now: each gets a vote. */
function playingSeats(driver: MatchDriver): number[] {
  return driver.state.athletes.filter((a) => a.seat !== null && a.online).map((a) => a.seat!);
}
