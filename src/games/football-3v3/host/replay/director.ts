import type { MatchView } from "../../engine/view";
import { blendViews } from "../../engine/view-blend";
import type { PlayFacts } from "./facts";
import { locate, scriptReplay, type ReplayScript, type ReplaySegment, type ReplayStage } from "./script";
import { SkipVotes } from "./skip";

/** A beat of the last still before cutting back to the try. */
const TAIL_S = 0.4;

/** What the replay shows at a moment: the still, its stage, and the match time it stands for. */
export interface ReplayFrame {
  view: MatchView;
  segment: ReplaySegment;
  time: number;
}

/** The replay's overlay: the stage it is at, who is in it and the play's numbers. */
export interface ReplayCard {
  stage: ReplayStage;
  passer: string | null;
  scorer: string;
  facts: PlayFacts;
  /** Playing in slow motion right now. */
  slow: boolean;
}

/**
 * Runs the touchdown replay on the big screen while the match waits. It
 * cuts the clip from the recorder, plays it stage by stage on the
 * animation clock, and ends it when it has played or when every player
 * has pressed a button to skip it.
 */
export class ReplayDirector {
  readonly votes = new SkipVotes();
  script: ReplayScript | null = null;
  private clip: readonly MatchView[] = [];
  private startMs = 0;
  private t = 0;

  get active(): boolean {
    return this.script !== null;
  }

  /** Starts a replay of the touchdown `scorer` just scored. False when there is nothing to show. */
  start(frames: readonly MatchView[], scorer: number, voters: readonly number[], nowMs: number): boolean {
    this.clip = frames.slice();
    this.script = scriptReplay(this.clip, scorer);
    this.startMs = nowMs;
    this.t = 0;
    if (!this.script) return false;
    this.votes.start(voters);
    return true;
  }

  /** Moves the replay on. True once it has played to the end. */
  update(nowMs: number): boolean {
    if (!this.script) return false;
    this.t = Math.max(0, nowMs - this.startMs) / 1000;
    return this.t >= this.script.length + TAIL_S;
  }

  /** What the replay shows right now, or null outside one. */
  frame(): ReplayFrame | null {
    const script = this.script;
    if (!script || this.clip.length < 2) return null;
    const spot = locate(script, this.t);
    if (!spot) return null;
    // The first still at or after the moment, found by halving.
    let lo = 1;
    let hi = this.clip.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.clip[mid]!.time < spot.time) lo = mid + 1;
      else hi = mid;
    }
    const i = lo;
    const a = this.clip[i - 1]!;
    const b = this.clip[i]!;
    const f = Math.max(0, Math.min(1, (spot.time - a.time) / Math.max(1e-6, b.time - a.time)));
    return { view: blendViews(a, b, f), segment: spot.segment, time: spot.time };
  }

  /** A button on a phone during the replay. True once everyone has asked to skip. */
  vote(seat: number): boolean {
    return this.active && this.votes.vote(seat);
  }

  /** A phone left mid replay: the others no longer wait for it. True when that leaves everyone agreed. */
  left(seat: number): boolean {
    return this.active && this.votes.setPresent(seat, false);
  }

  card(nameOf: (id: number) => string): ReplayCard | null {
    const script = this.script;
    const frame = this.frame();
    if (!script || !frame) return null;
    return {
      stage: frame.segment.stage,
      passer: script.passer !== null ? nameOf(script.passer) : null,
      scorer: nameOf(script.scorer),
      facts: script.facts,
      slow: frame.segment.rate < 0.9,
    };
  }

  stop(): void {
    this.script = null;
    this.clip = [];
    this.votes.clear();
  }
}
