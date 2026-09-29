import type { MatchState } from "./types";
import { viewOf, type MatchView } from "./view";

/** 1 yard a second in miles an hour. */
const MPH = 3600 / 1760;
/** Frames kept after the score, so the replay ends on the celebration starting. */
const TAIL = 90;
/** The longest play kept, in steps: a minute at 60 a second. */
const LIMIT = 3600;

/** The numbers the replay shows over the throw. */
export interface ThrowFacts {
  thrower: number;
  target: number;
  mph: number;
  rpm: number;
  /** The wobble at release, in degrees: a tight spiral is a few. */
  wobbleDeg: number;
  distance: number;
}

/** Where on the tape the moments are, as frame indexes. */
export interface TapeMarks {
  throw: number | null;
  catch: number | null;
  score: number | null;
}

/**
 * Stills of the current play from the snap, for the touchdown replay:
 * the host records after every step and, once a touchdown is scored,
 * plays the frames back (slowed round the throw) from whatever camera it
 * likes. It is cleared at each snap, so it always holds the last play.
 */
export class PlayTape {
  frames: MatchView[] = [];
  marks: TapeMarks = { throw: null, catch: null, score: null };
  facts: ThrowFacts | null = null;

  /** Call once after each step of the match. */
  record(state: MatchState): void {
    for (const e of state.events) {
      if (e.type === "hike") this.clear();
      if (e.type === "throw") {
        this.marks.throw = this.frames.length;
        this.facts = { thrower: e.athlete, target: e.target, mph: e.speed * MPH, rpm: (e.spin * 60) / (Math.PI * 2), wobbleDeg: (state.ball.wobble * 180) / Math.PI, distance: e.distance };
      }
      if (e.type === "catch" || e.type === "interception") this.marks.catch = this.frames.length;
      if (e.type === "score" && e.kind !== "pat" && e.kind !== "fieldgoal") this.marks.score = this.frames.length;
    }
    if (!this.recording(state)) return;
    this.frames.push(viewOf(state));
  }

  /** The tape runs from the snap through the play and a moment of the celebration. */
  private recording(state: MatchState): boolean {
    if (this.frames.length >= LIMIT) return false;
    if (state.phase === "live") return true;
    return state.phase === "score" && this.marks.score !== null && this.frames.length < this.marks.score + TAIL;
  }

  /** A touchdown is on the tape, ready to replay. */
  hasScore(): boolean {
    return this.marks.score !== null && this.frames.length > 0;
  }

  clear(): void {
    this.frames = [];
    this.marks = { throw: null, catch: null, score: null };
    this.facts = null;
  }
}
