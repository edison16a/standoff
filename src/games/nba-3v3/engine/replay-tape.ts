import { copyFlight } from "./shot-outcome/flight";
import type { MatchEvent } from "./events";
import type { Match } from "./match";
import type { Athlete, Ball, Phase, TeamId } from "./types";

/**
 * The last few seconds of play, kept frame by frame for the replay of
 * the winning basket. Each frame is a copy of everything the renderer
 * reads (the players, the ball, the phase) and the events that fired
 * in it, so the replay looks and sounds like the play did. It never
 * touches the match it records.
 */

export interface TapeFrame {
  time: number;
  phase: Phase;
  phaseT: number;
  winner: TeamId | null;
  score: [number, number];
  shotClock: number;
  athletes: Athlete[];
  ball: Ball;
  events: MatchEvent[];
}

/** Seconds kept: the whole play into the winning basket, and its aftermath. */
const KEEP = 9;

export class ReplayTape {
  private frames: TapeFrame[] = [];

  record(m: Match, events: readonly MatchEvent[]): void {
    this.frames.push({
      time: m.time,
      phase: m.phase,
      phaseT: m.phaseT,
      winner: m.winner,
      score: [m.score[0], m.score[1]],
      shotClock: m.shotClock,
      athletes: m.athletes.map(copyAthlete),
      ball: copyBall(m.ball),
      events: [...events],
    });
    const first = this.frames.findIndex((f) => f.time >= m.time - KEEP);
    if (first > 60) this.frames.splice(0, first);
  }

  /** The frames from `from` to `to` in match seconds. */
  clip(from: number, to: number): TapeFrame[] {
    return this.frames.filter((f) => f.time >= from && f.time <= to);
  }

  get length(): number {
    return this.frames.length;
  }
}

/** A copy deep enough that the match moving on never changes it. Plans and paths are never mutated, so they are shared. */
export function copyAthlete(a: Athlete): Athlete {
  return {
    ...a,
    move: { ...a.move },
    stick: { ...a.stick },
    guardAim: a.guardAim ? { ...a.guardAim } : null,
    action: { ...a.action },
    box: { ...a.box },
  };
}

export function copyBall(b: Ball): Ball {
  const shot = b.shot ? { ...b.shot, track: { ...b.shot.track }, flight: copyFlight(b.shot.flight), rolled: [...b.shot.rolled] } : null;
  return { ...b, pos: { ...b.pos }, vel: { ...b.vel }, w: { ...b.w }, aim: b.aim ? { ...b.aim } : null, impact: { ...b.impact, n: { ...b.impact.n } }, passRolled: [...b.passRolled], shot };
}
