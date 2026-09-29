import type { TeamId } from "../teams";
import { freeKickTarget } from "./free-kick";
import { kickPath, penaltyTarget, SET_KICK } from "./set-piece-kick";
import type { FoulKind, MatchState, RefereeAction, SetPieceKind, SetPieceStage } from "./types";
import { angleDiff, len, type Vec3 } from "./vec";

/** The referee in a still. */
export interface RefereeView {
  x: number;
  z: number;
  facing: number;
  speed: number;
  stride: number;
  action: RefereeAction;
  actionT: number;
}

/** A set piece in a still, with the white line while it is lined up. */
export interface SetPieceView {
  kind: SetPieceKind;
  team: TeamId;
  taker: number;
  stage: SetPieceStage;
  spot: { x: number; z: number };
  /** The planned flight, drawn on the pitch and in the air, until the kick is taken. */
  path: Vec3[] | null;
  /** The aimed spot on the goal while it is lined up, for the target marker. A free kick's curve never moves it. */
  target: Vec3 | null;
  aimX: number;
  aimY: number;
  curve: number;
  power: number;
  charging: boolean;
  launched: boolean;
  struckT: number;
  wall: number[];
}

export interface FoulView {
  by: number;
  victim: number;
  at: { x: number; z: number };
  kind: FoulKind;
  penalty: boolean;
  carded: boolean;
}

export function refereeView(state: MatchState): RefereeView {
  const r = state.referee;
  return { x: r.pos.x, z: r.pos.z, facing: r.facing, speed: len(r.vel), stride: r.stride, action: r.action, actionT: r.actionT };
}

export function setPieceView(state: MatchState): SetPieceView | null {
  const sp = state.setPiece;
  if (!sp) return null;
  const lining = state.phase === "setpiece" && sp.stage !== "struck";
  return {
    kind: sp.kind,
    team: sp.team,
    taker: sp.taker,
    stage: sp.stage,
    spot: { ...sp.spot },
    path: lining ? kickPath(sp) : null,
    target: lining ? (sp.kind === "penalty" ? penaltyTarget(sp) : freeKickTarget(sp, SET_KICK.nominal)) : null,
    aimX: sp.aimX,
    aimY: sp.aimY,
    curve: sp.curve,
    power: sp.power,
    charging: sp.charging,
    launched: sp.launched,
    struckT: sp.struckT,
    wall: [...sp.wall],
  };
}

export function foulView(state: MatchState): FoulView | null {
  const f = state.foul;
  return f ? { by: f.by, victim: f.victim, at: { ...f.at }, kind: f.kind, penalty: f.penalty, carded: f.carded } : null;
}

/** The referee part way between two stills, for slow motion. */
export function blendReferee(a: RefereeView, b: RefereeView, t: number): RefereeView {
  const pick = t < 0.5 ? a : b;
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    ...pick,
    x: mix(a.x, b.x),
    z: mix(a.z, b.z),
    facing: a.facing + angleDiff(a.facing, b.facing) * t,
    speed: mix(a.speed, b.speed),
    stride: mix(a.stride, b.stride),
    actionT: a.action === b.action ? mix(a.actionT, b.actionT) : pick.actionT,
  };
}
