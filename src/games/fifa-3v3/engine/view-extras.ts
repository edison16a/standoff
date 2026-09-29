import type { TeamId } from "../teams";
import { chargeLevel } from "./charge";
import type { MatchState, Referee, RefereeAction, SetPieceKind, SetStage } from "./types";
import type { Vec3 } from "./vec";

/** The referee as drawn: where, which way, and what he is doing. */
export interface RefereeView {
  x: number;
  z: number;
  facing: number;
  speed: number;
  stride: number;
  action: RefereeAction;
  actionT: number;
}

/** A free kick or penalty as the screen and the phone show it. */
export interface SetPieceView {
  kind: SetPieceKind;
  team: TeamId;
  taker: number;
  stage: SetStage;
  x: number;
  z: number;
  /** The white guide line, from the ball along the flight. */
  path: Vec3[];
  /** A free kick's bend, -1 to 1, for the phone's read out. */
  curve: number;
  /** The power bar while it is held, 0 to 1. */
  charge: number;
  wall: number[];
}

/** A kick struck in the last moments, which the camera follows from behind. */
export interface KickView {
  kind: SetPieceKind;
  team: TeamId;
  x: number;
  z: number;
}

/** How long the camera stays behind a free kick or penalty once it is struck. */
const FOLLOW_KICK = 1.8;

export function recentKick(state: MatchState): KickView | null {
  const k = state.taken;
  if (!k || state.phase !== "play" || state.time - k.at > FOLLOW_KICK) return null;
  return { kind: k.kind, team: k.team, x: k.spot.x, z: k.spot.z };
}

export function refereeView(r: Referee): RefereeView {
  return { x: r.pos.x, z: r.pos.z, facing: r.facing, speed: Math.hypot(r.vel.x, r.vel.z), stride: r.stride, action: r.action, actionT: r.actionT };
}

export function setPieceView(state: MatchState): SetPieceView | null {
  const sp = state.setPiece;
  if (!sp) return null;
  return {
    kind: sp.kind,
    team: sp.team,
    taker: sp.taker,
    stage: sp.stage,
    x: sp.spot.x,
    z: sp.spot.z,
    // The guide goes once the taker runs in: from then on it is all about the strike.
    path: sp.stage === "runup" ? [] : sp.path,
    curve: sp.curve,
    charge: sp.holding ? chargeLevel(sp.held) : 0,
    wall: [...sp.wall],
  };
}
