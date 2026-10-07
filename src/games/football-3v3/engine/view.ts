import { ceremonyTime } from "./ceremony";
import { downText, goalToGo, toGo } from "./downs";
import type { PlayEnd } from "./events";
import { yardToX } from "./field";
import { inGreen, meterAim, meterPower } from "./kick";
import type { Match } from "./match";
import { canThrow } from "./passing";
import { KICK, RULES } from "./tuning";
import type { Phase, TeamId } from "./types";
import { athleteView, type AthleteView } from "./view-athlete";
import { ballView, type BallView } from "./view-ball";

export type { BallView, GoalHitView, KnockView } from "./view-ball";
export type { AthleteView } from "./view-athlete";

/** The trophy presentation, from the cut to it: seconds in, who has the trophy, and whose side won. */
export interface CeremonyView {
  t: number;
  captain: number | null;
  team: TeamId;
}

export interface DriveView {
  offense: TeamId;
  down: number;
  toGo: number;
  yardline: number;
  goalToGo: boolean;
  conversion: boolean;
  /** "3rd and 4" and the like, for the scoreboard. */
  text: string;
  /** The blue line of scrimmage and the yellow first down line, in ground x. The yellow is null at goal to go. */
  losX: number;
  firstDownX: number | null;
  ballZ: number;
}

export interface KickView {
  kicker: number;
  fieldGoal: boolean;
  stage: "aim" | "power" | "windup" | "flight" | "done";
  /** The markers: moving while their stage runs, then locked. */
  aim: number;
  power: number;
  green: number;
  inGreen: boolean | null;
}

export interface MatchView {
  time: number;
  phase: Phase;
  phaseT: number;
  quarter: number;
  clock: number;
  overtime: boolean;
  score: [number, number];
  target: number;
  drive: DriveView;
  kick: KickView | null;
  ball: BallView;
  athletes: AthleteView[];
  /** Seconds left to pick a play, or to hike, while that is what is happening. */
  countdown: number | null;
  scorer: number | null;
  winner: TeamId | null;
  lastEnd: PlayEnd | null;
  ceremony: CeremonyView | null;
  /** The QB with his throw stick held and a pass still to throw, who brings the ball up ready. */
  aiming: number | null;
}

function driveView(m: Match): DriveView {
  const d = m.drive;
  return {
    offense: d.offense, down: d.down, toGo: toGo(d), yardline: d.los, goalToGo: goalToGo(d), conversion: d.conversion,
    text: downText(d), losX: yardToX(d.offense, d.los), firstDownX: goalToGo(d) ? null : yardToX(d.offense, d.firstDownAt), ballZ: d.ballZ,
  };
}

function kickView(m: Match): KickView | null {
  const k = m.kick;
  if (!k) return null;
  const aim = k.aim ?? (k.stage === "aim" ? meterAim(k.t) : 0);
  const power = k.power ?? (k.stage === "power" ? meterPower(k.t) : 0);
  return { kicker: k.kicker, fieldGoal: k.fieldGoal, stage: k.stage, aim, power, green: KICK.green, inGreen: k.aim === null ? null : inGreen(k.aim) };
}

function countdown(m: Match): number | null {
  if (m.phase === "choose" || m.phase === "convert") return Math.max(0, RULES.chooseSeconds - m.phaseT);
  if (m.phase === "presnap") return Math.max(0, RULES.hikeSeconds - m.phaseT);
  return null;
}

function ceremonyOf(m: Match): CeremonyView | null {
  const t = ceremonyTime(m);
  if (t === null || m.winner === null) return null;
  return { t, captain: m.ceremony?.captain ?? null, team: m.winner };
}

export function buildView(m: Match): MatchView {
  const b = m.ball;
  const ceremony = ceremonyOf(m);
  // While the ball is in the air the ring stays on the receiver it was thrown to.
  const target = b.state === "pass" && b.pass ? b.pass.to : (m.play?.target ?? null);
  return {
    time: m.time, phase: m.phase, phaseT: m.phaseT, quarter: m.quarter, clock: m.clock, overtime: m.overtime,
    score: [m.score[0], m.score[1]], target: m.target, drive: driveView(m), kick: kickView(m),
    ball: ballView(b),
    athletes: m.athletes.map((a) => {
      const role = !ceremony ? null : a.id === ceremony.captain ? "captain" : a.team === ceremony.team ? "mate" : "beaten";
      return athleteView(a, b.state === "held" && b.holder === a.id, target === a.id, role);
    }),
    countdown: countdown(m), scorer: m.scorer, winner: m.winner, lastEnd: m.lastEnd, ceremony,
    aiming: m.athletes.find((a) => a.aim !== null && canThrow(m, a))?.id ?? null,
  };
}
