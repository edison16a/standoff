import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import { chargeLevel, isTap } from "./charge";
import type { Athlete, AthleteAction, Dive, KeeperAction, MatchState, Phase, SkillKind } from "./types";
import { len } from "./vec";
import { jumpLift } from "./jump";
import { guardStatus, type GuardStatus } from "./guard";
import { refereeView, setPieceView, type RefereeView, type SetPieceView } from "./view-extras";

export { blendViews } from "./view-blend";
export type { RefereeView, SetPieceView } from "./view-extras";

/**
 * A still of the match for drawing: plain numbers, no references back
 * into the simulation. The renderer draws only these, so a replay is
 * just a list of stills played back slower.
 */
export interface AthleteView {
  id: number;
  team: TeamId;
  character: CharacterId;
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
  /** How high the boots are off the turf, in a jump. */
  lift: number;
  /** Guard is held, and whether it is shadowing the man now. */
  guard: GuardStatus;
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
  held: boolean;
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
  /** The free kick or penalty being lined up, with the guide line. */
  setPiece: SetPieceView | null;
  /** Who a foul was on and who gave it away, from the whistle until the kick. */
  foul: { offender: number; victim: number; x: number; z: number } | null;
}

export function buildView(state: MatchState): MatchView {
  const owner = state.ball.owner;
  const scorer = state.lastGoal?.scorer ?? null;
  const celebrating = state.phase === "goal" || state.phase === "replay";
  const b = state.ball;
  return {
    time: state.time,
    phase: state.phase,
    phaseT: state.phaseT,
    clock: state.clock,
    golden: state.golden,
    score: [state.score[0], state.score[1]],
    ball: { x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: b.vel.x, vy: b.vel.y, vz: b.vel.z, held: owner !== null },
    athletes: state.athletes.map((a) => ({
      id: a.id,
      team: a.team,
      character: a.character,
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
      signature: state.phase === "fulltime" || (celebrating && a.id === scorer),
      lift: a.action === "jump" ? jumpLift(a.actionT) : 0,
      guard: guardStatus(state, a),
    })),
    keepers: [keeperView(state, 0), keeperView(state, 1)],
    scorer,
    winner: state.winner,
    referee: refereeView(state.referee),
    setPiece: setPieceView(state),
    foul: state.foul ? { offender: state.foul.offender, victim: state.foul.victim, x: state.foul.at.x, z: state.foul.at.z } : null,
  };
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
