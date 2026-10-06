import type { BuildId } from "../builds";
import type { TeamId } from "../teams";
import { ceremonyTime } from "./ceremony";
import { chargeLevel, isTap } from "./charge";
import { netsView, type NetsView } from "./net-view";
import type { Athlete, AthleteAction, Dive, KeeperAction, MatchState, Phase, SkillKind } from "./types";
import { len } from "./vec";
import { foulView, refereeView, setPieceView, type FoulView, type RefereeView, type SetPieceView } from "./view-extra";

export type { FoulView, RefereeView, SetPieceView };

/**
 * A still of the match for drawing: plain numbers, no references back
 * into the simulation. The renderer draws only these, so a replay is
 * just a list of stills played back slower.
 */
export interface AthleteView {
  id: number;
  team: TeamId;
  build: BuildId;
  seat: number | null;
  x: number;
  z: number;
  facing: number;
  speed: number;
  stride: number;
  action: AthleteAction;
  actionT: number;
  actionLen: number;
  power: number;
  hasBall: boolean;
  /** The charge bar is up: Shoot/Pass held past a tap with the ball. */
  bar: boolean;
  /** How full the bar is, 0 to 1, and 0 without one. Drives the wind up. */
  charge: number;
  /** The skill move under way while the action is "skill", and the side it takes the ball to, or the side a beaten defender lunges. */
  skill: SkillKind | null;
  skillSide: 1 | -1;
  /** The goal scorer does their own celebration, team mates a plain cheer. */
  signature: boolean;
  /** Guard is shadowing a man: a low, square defensive stance. */
  guarding: boolean;
  /** Standing in a free kick wall, hands in front, waiting for the kick. */
  wall: boolean;
  /** At the trophy ceremony: the captain lifting the cup, a team mate, or one of the beaten side. */
  ceremony: CeremonyRole | null;
}

export type CeremonyRole = "captain" | "mate" | "beaten";

/** The trophy ceremony, from the cut to it: seconds in, who has the cup, and whose side won. */
export interface CeremonyView {
  t: number;
  captain: number | null;
  team: TeamId;
}

export interface KeeperView {
  team: TeamId;
  x: number;
  z: number;
  facing: number;
  action: KeeperAction;
  actionT: number;
  dive: Dive | null;
  holding: boolean;
}

export interface BallView {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Angular velocity in radians a second, for the replay's spin reading. */
  spin: number;
  /** Sidespin about the vertical, which is the curl. */
  curl: number;
  /** The spin itself about each axis, radians a second, so the ball is drawn turning as it really does. */
  sx: number;
  sy: number;
  sz: number;
  held: boolean;
}

/** The shot in the air: who struck it and where on the goal it was aimed. */
export interface ShotView {
  shooter: number;
  x: number;
  y: number;
  z: number;
}

export interface MatchView {
  time: number;
  phase: Phase;
  phaseT: number;
  clock: number;
  golden: boolean;
  score: [number, number];
  ball: BallView;
  athletes: AthleteView[];
  keepers: [KeeperView, KeeperView];
  scorer: number | null;
  winner: TeamId | null;
  referee: RefereeView;
  setPiece: SetPieceView | null;
  foul: FoulView | null;
  shot: ShotView | null;
  ceremony: CeremonyView | null;
  nets: NetsView;
}

export function buildView(state: MatchState): MatchView {
  const owner = state.ball.owner;
  const scorer = state.lastGoal?.scorer ?? null;
  const celebrating = state.phase === "goal" || state.phase === "replay";
  const b = state.ball;
  const wall = state.setPiece?.wall ?? [];
  const ceremony = ceremonyOf(state);
  return {
    time: state.time,
    phase: state.phase,
    phaseT: state.phaseT,
    clock: state.clock,
    golden: state.golden,
    score: [state.score[0], state.score[1]],
    ball: { x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: b.vel.x, vy: b.vel.y, vz: b.vel.z, spin: Math.hypot(b.spin.x, b.spin.y, b.spin.z), curl: b.spin.y, sx: b.spin.x, sy: b.spin.y, sz: b.spin.z, held: owner !== null },
    nets: netsView(state),
    athletes: state.athletes.map((a) => ({
      id: a.id,
      team: a.team,
      build: a.build,
      seat: a.online ? a.seat : null,
      x: a.pos.x,
      z: a.pos.z,
      facing: a.facing,
      speed: len(a.vel),
      stride: a.stride,
      action: a.action,
      actionT: a.actionT,
      actionLen: a.actionLen,
      power: a.power,
      hasBall: owner?.kind === "athlete" && owner.id === a.id,
      ...barOf(a, owner?.kind === "athlete" && owner.id === a.id),
      skill: a.action === "skill" ? a.skill.kind : null,
      skillSide: a.skill.side,
      // At full time the winners bounce and cheer together; the SUI and the slide are for goals.
      signature: celebrating && a.id === scorer,
      guarding: a.guard.on,
      wall: wall.includes(a.id) && (state.phase === "setpiece" || a.action === "jump"),
      ceremony: !ceremony ? null : a.id === ceremony.captain ? "captain" : a.team === ceremony.team ? "mate" : "beaten",
    })),
    keepers: [keeperView(state, 0), keeperView(state, 1)],
    scorer,
    winner: state.winner,
    referee: refereeView(state),
    setPiece: setPieceView(state),
    foul: foulView(state),
    shot: state.flight ? { shooter: state.flight.shooter, x: state.flight.target.x, y: state.flight.target.y, z: state.flight.target.z } : null,
    ceremony,
  };
}

function ceremonyOf(state: MatchState): CeremonyView | null {
  const t = ceremonyTime(state);
  if (t === null || !state.ceremony || state.winner === null) return null;
  return { t, captain: state.ceremony.captain, team: state.winner };
}

function barOf(a: Athlete, hasBall: boolean): { bar: boolean; charge: number } {
  const bar = a.charging && hasBall && a.action === "free" && !isTap(a.charge);
  return { bar, charge: bar ? chargeLevel(a.charge) : 0 };
}

function keeperView(state: MatchState, team: TeamId): KeeperView {
  const k = state.keepers[team];
  const owner = state.ball.owner;
  return {
    team,
    x: k.pos.x,
    z: k.pos.z,
    facing: k.facing,
    action: k.action,
    actionT: k.actionT,
    dive: k.dive ? { ...k.dive } : null,
    holding: owner?.kind === "keeper" && owner.team === team,
  };
}
