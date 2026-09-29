import type { MatchEvent } from "../engine/events";
import type { Entry, Match } from "../engine/match";
import { ReplayTape, type TapeFrame } from "../engine/replay-tape";
import { Replay } from "./replay";

/** The winners celebrate this long, in game seconds, before the replay rolls. */
const DELAY = 1.6;
/** The replay starts this long before the scorer gathered, and runs on this long after the ball dropped. */
const LEAD = 1.7;
const TAIL = 0.9;

/**
 * Keeps the tape running through the game and, once someone wins,
 * cuts the replay of the winning basket out of it: from just before the
 * scorer gathered for the shot to just after it dropped, with the
 * defender nearest him at the gather as the second view.
 */
export class ReplayDirector {
  readonly tape = new ReplayTape();
  replay: Replay | null = null;
  private lastScore: { id: number; time: number } | null = null;
  private winning: { id: number; time: number } | null = null;
  private started = false;
  private readonly listeners = new Set<(event: MatchEvent, ghost: Match) => void>();

  constructor(private readonly entries: readonly Entry[]) {}

  /** Someone has won and the replay has not rolled yet: the winners are still having their moment. */
  get pending(): boolean {
    return this.winning !== null && !this.started;
  }

  /** Events of the replay as it plays, for the sound and the effects. */
  listen(listener: (event: MatchEvent, ghost: Match) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Called after every game step with the events it fired. */
  record(m: Match, events: readonly MatchEvent[]): void {
    if (this.started) return;
    for (const e of events) {
      if (e.type === "score") this.lastScore = { id: e.id, time: m.time };
      if (e.type === "win") this.winning = this.lastScore;
    }
    this.tape.record(m, events);
  }

  /** Rolls the replay once the winners have had their moment. `voters` are the seats that must agree to skip. */
  update(m: Match, voters: () => readonly number[]): void {
    const win = this.winning;
    if (this.started || !win || m.phase !== "over" || m.phaseT < DELAY) return;
    this.started = true;
    const { frames, gather } = this.clipFor(win);
    if (frames.length < 10) return;
    const atGather = frames.find((f) => f.time >= gather) ?? frames[0]!;
    const defender = nearestOpponent(atGather, win.id, this.entries);
    this.replay = new Replay({ entries: this.entries, scorer: win.id, defender, voters }, frames, (e, ghost) => {
      for (const listener of this.listeners) listener(e, ghost);
    });
  }

  /** Plays the replay on by a real frame; returns the slowed time, or null when there is none. */
  tick(realDt: number): number | null {
    const r = this.replay;
    if (!r) return null;
    const dt = r.tick(realDt);
    if (r.done) this.replay = null;
    return dt;
  }

  skip(seat: number): void {
    this.replay?.skip(seat);
    if (this.replay?.done) this.replay = null;
  }

  /** From just before the scorer's last gather (the start of the shot, the drive or the free throw) to just after the basket. */
  private clipFor(win: { id: number; time: number }): { frames: TapeFrame[]; gather: number } {
    const before = this.tape.clip(win.time - 6, win.time);
    let gather = win.time - 1.2;
    for (const f of before) for (const e of f.events) if (e.type === "gather" && e.id === win.id) gather = f.time;
    return { frames: this.tape.clip(gather - LEAD, win.time + TAIL), gather };
  }
}

/** The defender nearest the scorer at the start of the clip: the man on him. */
function nearestOpponent(frame: TapeFrame, scorer: number, entries: readonly Entry[]): number {
  const s = frame.athletes[scorer]!;
  let best = scorer;
  let bestD = Infinity;
  frame.athletes.forEach((a, i) => {
    if (entries[i]?.team === entries[scorer]?.team) return;
    const d = Math.hypot(a.x - s.x, a.z - s.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
