import type { CharacterId } from "../roster";
import { downText, goalToGo, toGo } from "./downs";
import type { PlayEnd } from "./events";
import { yardToX } from "./field";
import type { SpinStyle } from "./flight";
import { inGreen, meterAim, meterPower } from "./kick";
import type { Match } from "./match";
import { KICK, RULES } from "./tuning";
import type { ActionKind, BallState, JukeKind, Phase, Role, TeamId } from "./types";
import type { V3 } from "./vec";

/**
 * A still of the match for drawing: plain numbers, no references back
 * into the simulation. The renderer and the HUD draw only these, so a
 * replay is just a list of stills played back slower.
 */
export interface AthleteView {
  id: number;
  team: TeamId;
  role: Role;
  character: CharacterId | null;
  number: number;
  seat: number | null;
  x: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  speed: number;
  action: ActionKind;
  actionT: number;
  actionDur: number;
  juke: JukeKind | null;
  /** Which way a juke or side step goes, 1 left of the run and -1 right. */
  side: 1 | -1;
  spike: boolean;
  hasBall: boolean;
  /** The throw stick is on this receiver: light up the ring under them. */
  targeted: boolean;
  guarding: number | null;
  rushing: boolean;
  /** In contact with an opposing lineman. */
  blocked: boolean;
}

export interface BallView extends V3 {
  vx: number;
  vy: number;
  vz: number;
  /** The long axis as a unit vector, and the spin about it (or the tumble angle). */
  axis: V3;
  roll: number;
  spin: number;
  style: SpinStyle;
  state: BallState;
  holder: number | null;
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

export function buildView(m: Match): MatchView {
  const b = m.ball;
  const f = b.flight;
  const target = m.play?.target ?? null;
  return {
    time: m.time, phase: m.phase, phaseT: m.phaseT, quarter: m.quarter, clock: m.clock, overtime: m.overtime,
    score: [m.score[0], m.score[1]], target: m.target, drive: driveView(m), kick: kickView(m),
    ball: {
      x: b.pos.x, y: b.pos.y, z: b.pos.z,
      vx: f?.vel.x ?? 0, vy: f?.vel.y ?? 0, vz: f?.vel.z ?? 0,
      axis: f ? { ...f.axis } : { x: 1, y: 0, z: 0 }, roll: f?.roll ?? 0, spin: f?.spin ?? 0, style: f?.style ?? "spiral",
      state: b.state, holder: b.state === "held" ? b.holder : null,
    },
    athletes: m.athletes.map((a) => {
      const act = a.action;
      return {
        id: a.id, team: a.team, role: a.role, character: a.character, number: a.number, seat: a.auto ? null : a.seat,
        x: a.x, z: a.z, yaw: a.yaw, vx: a.vx, vz: a.vz, speed: Math.hypot(a.vx, a.vz),
        action: act.kind, actionT: "t" in act ? act.t : 0, actionDur: "dur" in act ? act.dur : 0,
        juke: act.kind === "juke" ? act.juke : null, side: act.kind === "juke" ? act.side : 1,
        spike: act.kind === "celebrate" && act.spike,
        hasBall: b.state === "held" && b.holder === a.id,
        targeted: target === a.id, guarding: a.guard, rushing: a.rushT > 0, blocked: a.blocked > 0,
      };
    }),
    countdown: countdown(m), scorer: m.scorer, winner: m.winner, lastEnd: m.lastEnd,
  };
}
