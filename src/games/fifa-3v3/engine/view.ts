import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import type { AthleteAction, Dive, KeeperAction, MatchState, Phase } from "./types";
import { angleDiff, len } from "./vec";

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
  /** 0 to 1 while Shoot is held. */
  charge: number;
  /** The goal scorer does their own celebration, team mates a plain cheer. */
  signature: boolean;
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
      charge: a.charging ? Math.min(1, a.charge / 0.75) : 0,
      signature: state.phase === "fulltime" || (celebrating && a.id === scorer),
    })),
    keepers: [keeperView(state, 0), keeperView(state, 1)],
    scorer,
    winner: state.winner,
  };
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

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixAngle = (a: number, b: number, t: number) => a + angleDiff(a, b) * t;

/**
 * A still part way between two, for smooth slow motion replays.
 * Positions blend; states like the action switch at the halfway mark.
 */
export function blendViews(a: MatchView, b: MatchView, t: number): MatchView {
  const pick = t < 0.5 ? a : b;
  return {
    ...pick,
    time: mix(a.time, b.time, t),
    ball: { ...pick.ball, x: mix(a.ball.x, b.ball.x, t), y: mix(a.ball.y, b.ball.y, t), z: mix(a.ball.z, b.ball.z, t) },
    athletes: pick.athletes.map((p, i) => {
      const from = a.athletes[i] ?? p;
      const to = b.athletes[i] ?? p;
      const sameAction = from.action === to.action;
      return {
        ...p,
        x: mix(from.x, to.x, t),
        z: mix(from.z, to.z, t),
        facing: mixAngle(from.facing, to.facing, t),
        speed: mix(from.speed, to.speed, t),
        stride: mix(from.stride, to.stride, t),
        actionT: sameAction ? mix(from.actionT, to.actionT, t) : p.actionT,
      };
    }),
    keepers: pick.keepers.map((p, i) => {
      const from = a.keepers[i] ?? p;
      const to = b.keepers[i] ?? p;
      return { ...p, x: mix(from.x, to.x, t), z: mix(from.z, to.z, t), facing: mixAngle(from.facing, to.facing, t), actionT: from.action === to.action ? mix(from.actionT, to.actionT, t) : p.actionT };
    }) as [KeeperView, KeeperView],
  };
}
