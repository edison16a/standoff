import type { Role } from "../roles";
import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import { linemanStride } from "./linemen";
import { ballNose, rpm } from "./ball";
import { downLabel, goalToGo, toGo } from "./downs";
import { spotLabel } from "./field";
import { kickKind } from "./kick";
import { aimMeter, powerMeter } from "./meters";
import { MATCH } from "./tuning";
import type { AthleteAction, BallMode, DownKind, JukeKind, KickState, LinemanAction, MatchState, Phase, PlayCall, KickKind, ScoreKind } from "./types";
import { len, len3, type Vec3 } from "./vec";

/**
 * A still of the game for drawing: plain numbers, no references back into
 * the simulation. The renderer draws only these, so a replay is a list of
 * stills played back slower.
 */
export interface AthleteView {
  id: number;
  team: TeamId;
  role: Role;
  character: CharacterId;
  seat: number | null;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  speed: number;
  stride: number;
  action: AthleteAction;
  actionT: number;
  actionLen: number;
  downKind: DownKind;
  juke: JukeKind | null;
  jukeSide: 1 | -1;
  hasBall: boolean;
  /** The throw stick is on this receiver: the ring under him lights up. */
  targeted: boolean;
  guarding: boolean;
  rushing: boolean;
}

export interface LinemanView {
  id: number;
  team: TeamId;
  x: number;
  z: number;
  facing: number;
  action: LinemanAction;
  actionT: number;
  stride: number;
  surge: number;
}

export interface BallView {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mode: BallMode;
  holder: number | null;
  /** Where the nose points, wobble included. */
  nose: Vec3;
  /** Roll about the long axis so far, radians, and the spin in revolutions a minute. */
  roll: number;
  rpm: number;
  wobble: number;
  /** A kick's end over end turn so far. */
  tumble: number;
  speed: number;
}

export interface KickView extends Omit<KickState, "spot" | "landed"> {
  spotX: number;
  spotZ: number;
  /** Where the bar is now, for the host's drawing of the phone's bar. */
  aimNow: number;
  powerNow: number;
}

export interface MatchView {
  time: number;
  phase: Phase;
  phaseT: number;
  quarter: number;
  clock: number;
  overtime: boolean;
  score: [number, number];
  offense: TeamId;
  down: number;
  toGo: number;
  goalToGo: boolean;
  /** "3rd & 7", "1st & Goal", or "Try" on the play after a touchdown. */
  downText: string;
  spotText: string;
  /** The line of scrimmage (blue) and the first down line (yellow), as x. */
  los: number;
  firstDown: number;
  ballZ: number;
  isTry: boolean;
  call: PlayCall | null;
  /** What a Kick call would be from here. */
  kickKind: KickKind;
  /** Seconds left to make the call, or to hike, in those phases. */
  timeLeft: number;
  carrier: number | null;
  target: number | null;
  pass: { thrower: number; target: number; catchAt: Vec3; eta: number; t: number } | null;
  athletes: AthleteView[];
  linemen: LinemanView[];
  ball: BallView;
  kick: KickView | null;
  winner: TeamId | null;
  lastScore: { team: TeamId; kind: ScoreKind; by: number | null; thrower: number | null } | null;
}

function timeLeft(state: MatchState): number {
  if (state.phase === "call") return Math.max(0, MATCH.callWait - state.phaseT);
  if (state.phase === "presnap") return Math.max(0, MATCH.hikeWindow - state.phaseT);
  return 0;
}

export function viewOf(state: MatchState): MatchView {
  const { drive, play, ball, kick } = state;
  return {
    time: state.time,
    phase: state.phase,
    phaseT: state.phaseT,
    quarter: state.quarter,
    clock: state.clock,
    overtime: state.overtime,
    score: [state.score[0], state.score[1]],
    offense: drive.offense,
    down: drive.down,
    toGo: toGo(drive),
    goalToGo: goalToGo(drive),
    downText: play.isTry ? "Try" : downLabel(drive),
    spotText: spotLabel(drive.offense, drive.los),
    los: drive.los,
    firstDown: drive.firstDown,
    ballZ: drive.ballZ,
    isTry: play.isTry,
    call: play.call,
    kickKind: kickKind(state),
    timeLeft: timeLeft(state),
    carrier: play.carrier,
    target: play.target,
    pass: play.pass ? { thrower: play.pass.thrower, target: play.pass.target, catchAt: { ...play.pass.catchAt }, eta: play.pass.eta, t: play.pass.t } : null,
    athletes: state.athletes.map((a) => ({
      id: a.id,
      team: a.team,
      role: a.role,
      character: a.character,
      seat: a.seat,
      x: a.pos.x,
      z: a.pos.z,
      vx: a.vel.x,
      vz: a.vel.z,
      facing: a.facing,
      speed: len(a.vel),
      stride: a.stride,
      action: a.action,
      actionT: a.actionT,
      actionLen: a.actionLen,
      downKind: a.downKind,
      juke: a.juke.kind,
      jukeSide: a.juke.side,
      hasBall: ball.holder === a.id && ball.mode === "held",
      targeted: play.target === a.id,
      guarding: a.guard.held,
      rushing: a.rush,
    })),
    linemen: state.linemen.map((l) => ({ id: l.id, team: l.team, x: l.pos.x, z: l.pos.z, facing: l.facing, action: l.action, actionT: l.actionT, stride: linemanStride(l), surge: l.surge })),
    ball: { x: ball.pos.x, y: ball.pos.y, z: ball.pos.z, vx: ball.vel.x, vy: ball.vel.y, vz: ball.vel.z, mode: ball.mode, holder: ball.holder, nose: ballNose(ball), roll: ball.roll, rpm: rpm(ball), wobble: ball.wobble, tumble: ball.tumble, speed: len3(ball.vel) },
    kick: kick ? { kind: kick.kind, stage: kick.stage, t: kick.t, aim: kick.aim, power: kick.power, kicker: kick.kicker, result: kick.result, spotX: kick.spot.x, spotZ: kick.spot.z, aimNow: aimMeter(kick.t), powerNow: powerMeter(kick.t) } : null,
    winner: state.winner,
    lastScore: state.lastScore ? { ...state.lastScore } : null,
  };
}
