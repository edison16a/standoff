import { meterView, type MeterView } from "./meter-live";
import type { BuildId } from "../builds";
import { ceremonyTime } from "./ceremony";
import { downText, goalToGo, toGo } from "./downs";
import type { PlayEnd } from "./events";
import { yardToX } from "./field";
import { inGreen, meterAim, meterPower } from "./kick";
import type { Match } from "./match";
import { KICK, RULES } from "./tuning";
import type { ApproachKind, TackleKind } from "./tackle-preset";
import type { ActionKind, DownCause, JukeKind, Phase, Role, TackleBind, TeamId } from "./types";
import { ballView, type BallView } from "./view-ball";

export type { BallView, GoalHitView, KnockView } from "./view-ball";

/**
 * A still of the match for drawing: plain numbers, no references back
 * into the simulation. The renderer and the HUD draw only these, so a
 * replay is just a list of stills played back slower.
 */
export interface AthleteView {
  id: number;
  team: TeamId;
  role: Role;
  build: BuildId | null;
  number: number;
  /** The phone steering this player now, for its ring; null for the computer. Moves with a pass to a computer teammate. */
  seat: number | null;
  x: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  speed: number;
  /** Acceleration on the ground: the body leans into it, and a hard one is a planted foot. */
  ax: number;
  az: number;
  /** Seconds left of shaky footing after a jolt or a broken tackle. */
  stagger: number;
  action: ActionKind;
  actionT: number;
  actionDur: number;
  juke: JukeKind | null;
  /** Which way a juke or side step goes, 1 left of the run and -1 right. */
  side: 1 | -1;
  /** Seconds a juke pushes off its planted foot, 0 outside a juke: the drawing keeps that foot still. */
  plant: number;
  /** A throw that is the soft pitch to the back on a run call, not a pass. */
  lob: boolean;
  /** Why a player is on the ground, while they are: a tackled carrier lands differently from a diver. */
  downCause: DownCause | null;
  /** The tackle preset a lunge was picked as, while lunging. */
  lunge: ApproachKind | null;
  /** The tackle preset this man is part of while he is down in one, and his part in it. */
  tackle: { kind: TackleKind; role: TackleBind["role"]; side: 1 | -1 } | null;
  /** Fooled by a juke: seconds into the stumble and which way he lurches. */
  stumble: { t: number; side: 1 | -1 } | null;
  spike: boolean;
  hasBall: boolean;
  /** The throw stick is on this receiver: light up the ring under them. */
  targeted: boolean;
  guarding: number | null;
  rushing: boolean;
  /** In contact with an opposing lineman; for a lineman, locked up with the one across. */
  blocked: boolean;
  /** At the trophy presentation: the one lifting it, a team mate, or one of the beaten side. */
  ceremony: "captain" | "mate" | "beaten" | null;
}

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
  /** The throw meter over the QB: running while a person holds the throw, then where it stopped. */
  meter: MeterView | null;
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
      const act = a.action;
      return {
        id: a.id, team: a.team, role: a.role, build: a.build, number: a.number, seat: a.auto ? null : a.pilot,
        x: a.x, z: a.z, yaw: a.yaw, vx: a.vx, vz: a.vz, speed: Math.hypot(a.vx, a.vz), ax: a.ax, az: a.az, stagger: a.stagger,
        action: act.kind, actionT: "t" in act ? act.t : 0, actionDur: "dur" in act ? act.dur : 0,
        juke: act.kind === "juke" ? act.juke : null, side: act.kind === "juke" ? act.side : 1,
        plant: act.kind === "juke" ? act.plant : 0, lob: act.kind === "throw" && act.lob,
        downCause: act.kind === "down" ? act.cause : null,
        lunge: act.kind === "lunge" ? act.approach : null,
        tackle: act.kind === "down" && act.bind ? { kind: act.bind.kind, role: act.bind.role, side: act.bind.side } : null,
        stumble: a.stumble && { ...a.stumble },
        spike: act.kind === "celebrate" && act.spike,
        hasBall: b.state === "held" && b.holder === a.id,
        targeted: target === a.id, guarding: a.guard, rushing: a.rushT > 0, blocked: a.blocked > 0,
        ceremony: !ceremony ? null : a.id === ceremony.captain ? "captain" : a.team === ceremony.team ? "mate" : "beaten",
      };
    }),
    countdown: countdown(m), scorer: m.scorer, winner: m.winner, lastEnd: m.lastEnd, ceremony, meter: meterView(m),
  };
}
