import { statsOf } from "./body";
import type { FootballSkill } from "./bots/skill";
import type { Match } from "./match";
import { gradeLevel, meterLevel, meterWindow, METER, type MeterWindow, type PassGrade, type ThrowReading } from "./pass-meter";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/** How long the stopped marker and its grade stay on the big screen after the throw. */
export const RESULT_SHOWN = 1.1;

/** The throw meter as the big screen shows it: running while a QB holds the throw, then the reading he let go on. */
export interface MeterState {
  id: number;
  /** Seconds the throw has been held, on the match clock. */
  held: number;
  result: ThrowReading | null;
  /** Seconds since the release, while the result shows. */
  after: number;
}

export interface MeterView {
  id: number;
  level: number;
  window: MeterWindow;
  grade: PassGrade | null;
  /** 1 while held and just after the throw, easing to 0 as the result fades. */
  fade: number;
}

/** The QB still has his one forward pass this play: before the snap too, so a thumb down early is not lost. */
function couldThrow(m: Match, a: Athlete): boolean {
  const play = m.play;
  if (!play || play.call === "run" || play.passed || play.qbRun || (m.phase !== "presnap" && m.phase !== "live")) return false;
  return a.role === "qb" && a.team === m.offense && (m.phase === "presnap" || m.carrier()?.id === a.id || m.ball.state === "snap");
}

/** A person put a thumb on the throw (or took it off without throwing). */
export function holdThrow(m: Match, a: Athlete, down: boolean): void {
  if (down && couldThrow(m, a)) m.meter = { id: a.id, held: 0, result: null, after: 0 };
  else if (!down && m.meter?.id === a.id && !m.meter.result) m.meter = null;
}

/** The throw went with this reading: the marker stops there and the grade shows. */
export function showReading(m: Match, a: Athlete, reading: ThrowReading): void {
  m.meter = { id: a.id, held: m.meter?.id === a.id ? m.meter.held : 0, result: reading, after: 0 };
}

/** Seconds the meter has run for a QB still holding the throw, or null. */
export function heldFor(m: Match, a: Athlete): number | null {
  return m.meter && m.meter.id === a.id && !m.meter.result ? m.meter.held : null;
}

export function tickMeter(m: Match, dt: number): void {
  const s = m.meter;
  if (!s) return;
  if (s.result) {
    s.after += dt;
    if (s.after > RESULT_SHOWN) m.meter = null;
    return;
  }
  const a = m.athlete(s.id);
  // The chance to throw is gone (a sack, Run, the whistle): the meter goes with it.
  if (!a || !couldThrow(m, a)) m.meter = null;
  else s.held += dt;
}

export function meterView(m: Match): MeterView | null {
  const s = m.meter;
  const a = s ? m.athlete(s.id) : null;
  if (!s || !a) return null;
  const level = s.result ? s.result.level : meterLevel(s.held * 1000);
  const fade = s.result ? clamp((RESULT_SHOWN - s.after) / 0.3, 0, 1) : 1;
  return { id: s.id, level, window: meterWindow(statsOf(a).arm), grade: s.result?.grade ?? null, fade };
}

/**
 * A computer QB's timing: the marker stopped near the centre, closer the
 * better the level. Hard bots hit the green most of the time and now
 * and then the gold; easy ones float a few and fire a few.
 */
export function botReading(m: Match, qb: Athlete, skill: FootballSkill): ThrowReading {
  const sigma = 0.055 + (1 - skill.accuracy) * 0.13;
  const level = clamp(METER.center + m.rng.gauss(sigma), 0, 1);
  return gradeLevel(level, meterWindow(statsOf(qb).arm));
}
