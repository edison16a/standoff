import { BUILDS } from "../builds";
import { attackSign, other, type TeamId } from "../teams";
import { isHuman } from "./athlete";
import { newBall } from "./ball";
import { goalX } from "./goal";
import { makeKeeper, outward } from "./keeper";
import { laneOf } from "./lanes";
import { REF } from "./referee";
import { SET_KICK } from "./set-piece-kick";
import { KEEPER, PITCH } from "./tuning";
import type { Athlete, MatchState, SetPiece, SetPieceKind } from "./types";
import { add, type Vec2 } from "./vec";
import { behindBall, formWall, place, wallLine } from "./wall";

/** How far behind the ball each taker waits for the run up, and how far off to the side of the kicking foot. */
const RUN_UP = { free: { back: 2.1, side: 1.2 }, penalty: { back: 1.9, side: 1 } } as const;

/**
 * Who takes it: the player who was fouled, unless a phone's player on
 * that side can take it instead, since that is more fun than watching.
 */
export function pickTaker(state: MatchState, team: TeamId, fouled: number): Athlete {
  const victim = state.athletes[fouled];
  if (victim && victim.team === team && isHuman(victim)) return victim;
  const human = state.athletes.find((a) => a.team === team && isHuman(a));
  return human ?? victim ?? state.athletes.find((a) => a.team === team)!;
}

/** The penalty spot in front of a goal. */
export function penaltySpot(defending: TeamId): Vec2 {
  return { x: goalX(defending) + outward(defending) * PITCH.penaltySpot, z: 0 };
}

/**
 * The scene for the set piece. The ball on its spot and the taker a few
 * strides behind it. For a free kick the defenders form the wall, the
 * keeper takes the far side and the attackers wait at the edge of the
 * box. For a penalty the keeper is on his line and everyone else stands
 * outside the box behind the ball.
 */
export function setupSetPiece(state: MatchState, kind: SetPieceKind = state.foul?.penalty ? "penalty" : "free", team: TeamId = state.foul?.team ?? 0): void {
  const defending = other(team);
  const fouled = state.foul?.victim ?? -1;
  const spot = kind === "penalty" ? penaltySpot(defending) : { ...(state.foul?.at ?? { x: 0, z: 0 }) };
  const taker = pickTaker(state, team, fouled);
  for (const a of state.athletes) reset(a);
  // A right footer comes in from the left of the ball, a left footer from the right.
  const run = RUN_UP[kind];
  place(taker, behindBall(spot, defending, run.back, BUILDS[taker.build].foot === "left" ? run.side : -run.side), spot);
  const wall = kind === "free" ? formWall(state, defending, spot) : [];
  placeOthers(state, taker, wall, spot, defending, kind);
  const ball = newBall();
  ball.pos = { x: spot.x, y: ball.pos.y, z: spot.z };
  ball.lastTouch = { team, id: taker.id };
  state.ball = ball;
  state.flight = null;
  setKeepers(state, defending, spot, kind);
  // The referee paces out the wall and stands at its end, or by the box for a penalty.
  const ref = state.referee;
  ref.pos = kind === "free" ? refByWall(spot, defending, wall.length) : { x: goalX(defending) + outward(defending) * (PITCH.boxRadius + 1.5), z: -5 };
  ref.vel = { x: 0, z: 0 };
  ref.facing = Math.atan2(spot.z - ref.pos.z, spot.x - ref.pos.x);
  ref.action = "follow";
  ref.actionT = 0;
  const sp: SetPiece = {
    kind,
    team,
    taker: taker.id,
    spot,
    stage: "aim",
    stageT: 0,
    aimX: 0,
    aimY: kind === "penalty" ? 0.9 : 0,
    curve: 0,
    charge: 0,
    charging: false,
    power: SET_KICK.nominal,
    wall,
    armed: false,
    launched: false,
    struckT: 0,
  };
  state.setPiece = sp;
  state.phase = "setpiece";
  state.phaseT = 0;
  state.events.push({ type: "setpiece", kind, team, taker: taker.id });
}

function reset(a: Athlete): void {
  a.vel = { x: 0, z: 0 };
  a.action = "free";
  a.actionT = 0;
  a.charging = false;
  a.charge = 0;
  a.release = null;
  a.buffered = 0;
  a.skill.kind = null;
  a.noTouch = 0;
  a.guard.on = false;
  a.brain.thinkIn = 0.3;
}

/** Everyone not in the wall: attackers at the edge of the box, the rest spread behind the ball. */
function placeOthers(state: MatchState, taker: Athlete, wall: number[], spot: Vec2, defending: TeamId, kind: SetPieceKind): void {
  const gx = goalX(defending);
  const out = outward(defending);
  for (const a of state.athletes) {
    if (a === taker || wall.includes(a.id)) continue;
    const lane = laneOf(state, a) || (a.team === taker.team ? 1 : -1);
    let at: Vec2;
    if (kind === "penalty") at = { x: gx + out * (PITCH.boxRadius + 1.2 + (a.team === taker.team ? 0 : 1.4)), z: lane * 3.2 + (a.team === taker.team ? 0.8 : -0.8) };
    else if (a.team === taker.team) at = { x: gx + out * (PITCH.boxRadius - 1), z: lane * 3.4 };
    else at = { x: gx + out * 3.5, z: lane * 2.2 };
    place(a, clampPitch(at), spot);
  }
}

function setKeepers(state: MatchState, defending: TeamId, spot: Vec2, kind: SetPieceKind): void {
  const saves = [state.keepers[0].saves, state.keepers[1].saves];
  state.keepers = [makeKeeper(0), makeKeeper(1)];
  state.keepers[0].saves = saves[0]!;
  state.keepers[1].saves = saves[1]!;
  const k = state.keepers[defending];
  const gx = goalX(defending);
  // For a free kick he stands off his line on the far side of the wall; for a penalty, on it.
  const farZ = Math.abs(spot.z) < 0.6 ? 0 : -Math.sign(spot.z) * 0.7;
  k.pos = kind === "penalty" ? { x: gx + outward(defending) * KEEPER.lineGap, z: 0 } : { x: gx + outward(defending) * 0.9, z: farZ };
  k.facing = Math.atan2(spot.z - k.pos.z, spot.x - k.pos.x);
}

function refByWall(spot: Vec2, defending: TeamId, members: number): Vec2 {
  const line = wallLine(spot, defending);
  // At the end of the wall away from the cameras' side, a stride back toward the ball.
  const side = line.along.z < 0 ? 1 : -1;
  const end = add(line.centre, line.along, side * ((members / 2) * 0.56 + REF.standOff));
  return clampPitch(add(end, line.toward, -1));
}

function clampPitch(p: Vec2): Vec2 {
  return { x: Math.max(-PITCH.halfLength + 0.6, Math.min(PITCH.halfLength - 0.6, p.x)), z: Math.max(-PITCH.halfWidth + 0.6, Math.min(PITCH.halfWidth - 0.6, p.z)) };
}

/** The side the taker's goal is at, for the camera and the phone. */
export function takerSign(sp: SetPiece): 1 | -1 {
  return attackSign(sp.team);
}
