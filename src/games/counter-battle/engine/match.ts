import type { BattleEvent } from "./events";
import type { Fighter, TeamId } from "./fighter";
import { RULES } from "./tuning";

/**
 * The round and match clock. A round counts down, fights until one side
 * is all down, holds on the result, and starts over with the sides
 * swapped, until a team has five rounds.
 */
export type MatchPhase = "countdown" | "fight" | "round-over" | "match-over" | "done";

export interface MatchState {
  phase: MatchPhase;
  /** 1 based. */
  round: number;
  /** Seconds left in a timed phase. */
  timer: number;
  /** Seconds of fighting so far this round. */
  roundTime: number;
  score: [number, number];
  /** Who took the round just played: null for a draw. */
  roundWinner: TeamId | null;
  winner: TeamId | null;
}

export function newMatch(): MatchState {
  return { phase: "countdown", round: 1, timer: RULES.countdown, roundTime: 0, score: [0, 0], roundWinner: null, winner: null };
}

/** Which end of the field a team plays from in a round. Sides swap every round. */
export function sideOf(team: TeamId, round: number): 0 | 1 {
  return ((team + round - 1) % 2) as 0 | 1;
}

const alive = (fighters: readonly Fighter[], team: TeamId) => fighters.some((f) => f.team === team && f.alive);
const healthOf = (fighters: readonly Fighter[], team: TeamId) => fighters.filter((f) => f.team === team).reduce((sum, f) => sum + Math.max(0, f.health), 0);

/** The round's winner so far: a team, a draw (null), or undefined while both sides stand. */
export function roundOutcome(fighters: readonly Fighter[], timeUp: boolean): TeamId | null | undefined {
  const a = alive(fighters, 0);
  const b = alive(fighters, 1);
  if (a && !b) return 0;
  if (b && !a) return 1;
  if (!a && !b) return null;
  if (!timeUp) return undefined;
  // Called on time: the side with more health left takes it.
  const diff = healthOf(fighters, 0) - healthOf(fighters, 1);
  return diff > 0 ? 0 : diff < 0 ? 1 : null;
}

export interface MatchTick {
  events: BattleEvent[];
  /** True when the fighters should be put back for a new round. */
  resetRound: boolean;
}

/** Moves the clock on by `dt`. The battle calls this after the fighters have acted. */
export function tickMatch(m: MatchState, fighters: readonly Fighter[], dt: number): MatchTick {
  const events: BattleEvent[] = [];
  let resetRound = false;
  if (m.phase === "countdown") {
    const before = Math.ceil(m.timer);
    m.timer -= dt;
    if (m.timer > 0 && Math.ceil(m.timer) !== before) events.push({ type: "countdown", round: m.round, seconds: Math.ceil(m.timer) });
    if (m.timer <= 0) {
      m.phase = "fight";
      m.roundTime = 0;
      events.push({ type: "fight", round: m.round });
    }
  } else if (m.phase === "fight") {
    m.roundTime += dt;
    const outcome = roundOutcome(fighters, m.roundTime >= RULES.roundLimit);
    if (outcome !== undefined) {
      m.roundWinner = outcome;
      if (outcome !== null) m.score[outcome] += 1;
      events.push({ type: "round-end", round: m.round, winner: outcome, score: [m.score[0], m.score[1]] });
      const champion = m.score[0] >= RULES.roundsToWin ? 0 : m.score[1] >= RULES.roundsToWin ? 1 : null;
      if (champion !== null) {
        m.winner = champion;
        m.phase = "match-over";
        m.timer = RULES.matchHold;
        events.push({ type: "match-end", winner: champion, score: [m.score[0], m.score[1]] });
      } else {
        m.phase = "round-over";
        m.timer = RULES.roundHold;
      }
    }
  } else if (m.phase === "round-over") {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.round += 1;
      m.phase = "countdown";
      m.timer = RULES.countdown;
      m.roundTime = 0;
      m.roundWinner = null;
      resetRound = true;
      events.push({ type: "countdown", round: m.round, seconds: RULES.countdown });
    }
  } else if (m.phase === "match-over") {
    m.timer -= dt;
    if (m.timer <= 0) m.phase = "done";
  }
  return { events, resetRound };
}
