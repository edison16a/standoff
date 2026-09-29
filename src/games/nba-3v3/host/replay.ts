import type { MatchEvent } from "../engine/events";
import { Match, type Entry } from "../engine/match";
import { copyAthlete, copyBall, type TapeFrame } from "../engine/replay-tape";
import type { Athlete } from "../engine/types";
import { angleDiff } from "../engine/vec";
import { replayCamera, type ReplayCamera } from "./replay-camera";

export type ReplayView = "scorer" | "defender";

/** The replay runs at this share of real time. */
export const REPLAY_SPEED = 0.45;
const VIEWS: readonly ReplayView[] = ["scorer", "defender"];

export interface ReplayCast {
  entries: readonly Entry[];
  scorer: number;
  defender: number;
  /**
   * Seats that must all press a button before the replay can be skipped:
   * the phones in the game right now, so one that drops stops holding it
   * up and one that comes back gets a say.
   */
  voters: () => readonly number[];
}

/**
 * The replay of the winning basket: the recorded frames played back in
 * slow motion twice, first from over the scorer's shoulder, then from
 * behind the defender who was on him. Each pass plays on a stand in
 * match (the ghost) that the renderer draws like the real one, so every
 * pose and bounce comes out as it was. Any button skips, but only once
 * every player in the game has pressed one.
 */
export class Replay {
  ghost: Match;
  view: ReplayView = "scorer";
  done = false;
  readonly skipped = new Set<number>();
  private clock: number;
  private cursor = 0;
  private pass = 0;
  private cam: ReplayCamera | null = null;

  constructor(
    private readonly cast: ReplayCast,
    private readonly frames: readonly TapeFrame[],
    private readonly onEvent: (event: MatchEvent, ghost: Match) => void,
  ) {
    this.clock = frames[0]?.time ?? 0;
    this.ghost = this.makeGhost();
    this.done = frames.length < 2;
    if (this.done) return;
    this.apply();
    // The camera is placed now, so the first frame drawn is already the replay's and not a flash of the broadcast view.
    this.cam = replayCamera(this.view, this.ghost, cast, null, 0);
  }

  get scorer(): number {
    return this.cast.scorer;
  }

  /** Every voter has pressed skip, or there are none and the replay just plays. */
  get voters(): readonly number[] {
    return this.cast.voters();
  }

  skip(seat: number): void {
    if (!this.voters.includes(seat)) return;
    this.skipped.add(seat);
    this.count();
  }

  /** Done once every voter has pressed. With nobody left to vote it just plays out. */
  private count(): void {
    const voters = this.voters;
    if (voters.length > 0 && voters.every((s) => this.skipped.has(s))) this.done = true;
  }

  /** Moves the replay on by a real frame. Returns the slowed time, for the animation. */
  tick(realDt: number): number {
    // The last one holding out may have left.
    this.count();
    if (this.done) return 0;
    const dt = realDt * REPLAY_SPEED;
    this.clock += dt;
    const last = this.frames[this.frames.length - 1]!;
    if (this.clock >= last.time) {
      if (++this.pass >= VIEWS.length) {
        this.done = true;
        return dt;
      }
      // The second pass starts over from a new angle, on a fresh ghost so nothing eases across the cut.
      this.view = VIEWS[this.pass]!;
      this.clock = this.frames[0]!.time;
      this.cursor = 0;
      this.cam = null;
      this.ghost = this.makeGhost();
    }
    this.apply();
    this.cam = replayCamera(this.view, this.ghost, this.cast, this.cam, realDt);
    return dt;
  }

  camera(): ReplayCamera | null {
    return this.cam;
  }

  private makeGhost(): Match {
    const ghost = new Match({ entries: this.cast.entries, seed: 1 });
    ghost.checkBeat = false;
    return ghost;
  }

  /** Puts the ghost where the play was at the replay clock, between the two nearest frames, and fires what happened. */
  private apply(): void {
    const frames = this.frames;
    while (this.cursor < frames.length - 1 && frames[this.cursor + 1]!.time <= this.clock) {
      this.cursor++;
      for (const event of frames[this.cursor]!.events) this.onEvent(event, this.ghost);
    }
    const a = frames[this.cursor]!;
    const b = frames[Math.min(frames.length - 1, this.cursor + 1)]!;
    const u = b.time > a.time ? Math.min(1, Math.max(0, (this.clock - a.time) / (b.time - a.time))) : 0;
    const g = this.ghost;
    g.phase = a.phase;
    g.phaseT = a.phaseT;
    g.winner = a.winner;
    g.score = [a.score[0], a.score[1]];
    g.shotClock = a.shotClock;
    g.athletes.forEach((ga, i) => blendAthlete(ga, a.athletes[i]!, b.athletes[i]!, u));
    Object.assign(g.ball, copyBall(a.ball));
    const p = g.ball.pos;
    const q = b.ball.pos;
    p.x += (q.x - p.x) * u;
    p.y += (q.y - p.y) * u;
    p.z += (q.z - p.z) * u;
  }
}

/** One player between two frames: the place and the facing slide, and the action clock runs on if it is the same action. */
function blendAthlete(out: Athlete, a: Athlete, b: Athlete, u: number): void {
  Object.assign(out, copyAthlete(a));
  out.x += (b.x - a.x) * u;
  out.y += (b.y - a.y) * u;
  out.z += (b.z - a.z) * u;
  out.vx += (b.vx - a.vx) * u;
  out.vz += (b.vz - a.vz) * u;
  out.yaw += angleDiff(a.yaw, b.yaw) * u;
  // The dribble wraps from 1 back to 0 at each bounce, so it blends the short way round.
  out.dribble = (a.dribble + (((b.dribble - a.dribble + 1.5) % 1) - 0.5) * u + 1) % 1;
  if (out.action.kind !== "none" && b.action.kind === out.action.kind && "t" in b.action && "t" in out.action) {
    out.action.t += (b.action.t - out.action.t) * u;
  }
}
