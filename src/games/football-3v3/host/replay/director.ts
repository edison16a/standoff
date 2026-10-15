import type { MatchEvent } from "../../engine/events";
import type { MatchView } from "../../engine/view";
import { blendViews } from "../../engine/view-blend";
import { cuesBetween, type Cue } from "./cues";
import { locate, scriptReplay, type ReplayAngle, type ReplayScript, type ReplaySegment } from "./script";
import { SkipVotes } from "./skip";

/** A beat of the last still before cutting back to the try. */
const TAIL_S = 0.4;

/** What the replay shows at a moment: the still, its shot, and the match time it stands for. */
export interface ReplayFrame {
  view: MatchView;
  segment: ReplaySegment;
  time: number;
}

/** The replay's corner bug: which angle is on and whose touchdown it is. */
export interface ReplayCard {
  angle: ReplayAngle;
  scorer: string;
}

/**
 * Runs the touchdown replay on the big screen while the match waits. It
 * cuts the clip from the recorder, plays it shot by shot at full speed
 * on the animation clock with the play's own sounds, and ends it when it
 * has played or when every player has pressed a button to skip it.
 */
export class ReplayDirector {
  readonly votes = new SkipVotes();
  script: ReplayScript | null = null;
  private clip: readonly MatchView[] = [];
  private cues: readonly Cue[] = [];
  private startMs = 0;
  private t = 0;
  /** Where the last sounds were taken up to, in match time and take. */
  private heard = { time: -Infinity, take: -1 };

  get active(): boolean {
    return this.script !== null;
  }

  /** Starts a replay of the touchdown `scorer` just scored. False when there is nothing to show. */
  start(frames: readonly MatchView[], scorer: number, voters: readonly number[], nowMs: number, cues: readonly Cue[] = []): boolean {
    this.clip = frames.slice();
    this.cues = cues.slice();
    this.script = scriptReplay(this.clip, scorer);
    this.startMs = nowMs;
    this.t = 0;
    this.heard = { time: -Infinity, take: -1 };
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
    const a = this.clip[lo - 1]!;
    const b = this.clip[lo]!;
    const f = Math.max(0, Math.min(1, (spot.time - a.time) / Math.max(1e-6, b.time - a.time)));
    return { view: blendViews(a, b, f), segment: spot.segment, time: spot.time };
  }

  /**
   * The play's sounds passed since the last call: the pads, the hits,
   * the throw and the catch. A new take starts the sounds over with the
   * play; its first frame plays nothing from before it.
   */
  sounds(): MatchEvent[] {
    const frame = this.frame();
    if (!frame) return [];
    const take = frame.segment.take;
    const from = take === this.heard.take ? this.heard.time : frame.time;
    this.heard = { time: frame.time, take };
    return cuesBetween(this.cues, from, frame.time);
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
    return { angle: frame.segment.angle, scorer: nameOf(script.scorer) };
  }

  stop(): void {
    this.script = null;
    this.clip = [];
    this.cues = [];
    this.votes.clear();
  }
}
