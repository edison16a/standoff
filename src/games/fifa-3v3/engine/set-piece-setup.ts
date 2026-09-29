import { other, type TeamId } from "../teams";
import { isHuman } from "./athlete";
import { newBall } from "./ball";
import { SET_KICK } from "./defence-tuning";
import { goalX, inBox } from "./goal";
import { keeperHome, outward } from "./keeper";
import { setRefereeAction } from "./referee";
import { previewPath } from "./set-piece-kick";
import { placeWall, wallMembers, wantsWall } from "./set-piece-wall";
import { BALL, KEEPER, PITCH } from "./tuning";
import type { Athlete, Foul, MatchState, SetPiece } from "./types";
import { clamp, dist, norm, sub, type Vec2 } from "./vec";

/** Where the ball is placed: the penalty spot, or where the foul was, kept outside the box. */
function spotFor(foul: Foul): Vec2 {
  const defending = other(foul.team);
  const gx = goalX(defending);
  if (foul.kind === "penalty") return { x: gx + outward(defending) * PITCH.penaltySpot, z: 0 };
  if (!inBox(foul.at, defending)) return { ...foul.at };
  // Pushed back out to just beyond the box, along the line from the goal.
  const away = norm(sub(foul.at, { x: gx, z: 0 }));
  return { x: gx + away.x * (PITCH.boxRadius + 0.4), z: away.z * (PITCH.boxRadius + 0.4) };
}

/** A phone's player takes it if the side has one: the fouled player, else the nearest. Otherwise the fouled player. */
function chooseTaker(state: MatchState, foul: Foul, spot: Vec2): Athlete {
  const victim = state.athletes[foul.victim]!;
  if (isHuman(victim)) return victim;
  const people = state.athletes.filter((a) => a.team === foul.team && isHuman(a));
  people.sort((a, b) => dist(a.pos, spot) - dist(b.pos, spot));
  return people[0] ?? victim;
}

function reset(a: Athlete): void {
  a.vel = { x: 0, z: 0 };
  a.action = "free";
  a.actionT = 0;
  a.charging = false;
  a.charge = 0;
  a.release = null;
  a.buffered = 0;
  a.guarding = false;
  a.guardSpot = null;
  a.noTouch = 0;
  a.skill.kind = null;
}

const onPitch = (p: Vec2): Vec2 => ({ x: clamp(p.x, -PITCH.halfLength + 0.8, PITCH.halfLength - 0.8), z: clamp(p.z, -PITCH.halfWidth + 0.8, PITCH.halfWidth - 0.8) });

/**
 * Everyone else takes up their place. At a penalty they wait round the
 * edge of the box. At a free kick the attackers go to the far post and
 * the edge of the box, and the defenders left out of the wall mark them.
 */
function placeOthers(state: MatchState, sp: SetPiece, busy: Set<number>): void {
  const defending = other(sp.team);
  const gx = goalX(defending);
  const out = outward(defending);
  const rest = state.athletes.filter((a) => !busy.has(a.id));
  if (sp.kind === "penalty") {
    const angles = [0.62, -0.62, 0.95, -0.95, 1.25, -1.25];
    // Attackers and defenders side by side, ready for a rebound.
    rest.sort((a, b) => a.team - b.team || a.slot - b.slot);
    rest.forEach((a, i) => {
      const angle = angles[i % angles.length]!;
      const r = PITCH.boxRadius + 1.2 + Math.floor(i / angles.length) * 1.2;
      a.pos = onPitch({ x: gx + out * r * Math.cos(angle), z: r * Math.sin(angle) });
    });
  } else {
    const far = -(Math.sign(sp.spot.z) || 1);
    const spots: Vec2[] = [
      { x: gx + out * 5, z: far * 2.6 },
      { x: gx + out * (PITCH.boxRadius + 1.5), z: far * 5.5 },
      { x: gx + out * 3.5, z: -far * 1.5 },
    ];
    const attackers = rest.filter((a) => a.team === sp.team);
    attackers.forEach((a, i) => (a.pos = onPitch(spots[i % spots.length]!)));
    const markers = rest.filter((a) => a.team === defending);
    markers.forEach((d, i) => {
      const man = attackers[i];
      d.pos = man ? onPitch({ x: man.pos.x - out * 0.9, z: man.pos.z * 0.9 }) : onPitch({ x: gx + out * 3, z: 0 });
    });
  }
  for (const a of rest) a.facing = Math.atan2(sp.spot.z - a.pos.z, sp.spot.x - a.pos.x);
}

/** Keepers take their places: on the line for a penalty, covering the far side of a wall for a free kick. */
function placeKeepers(state: MatchState, sp: SetPiece): void {
  const defending = other(sp.team);
  for (const team of [0, 1] as TeamId[]) {
    const k = state.keepers[team];
    k.action = "set";
    k.actionT = 0;
    k.dive = null;
    k.vel = { x: 0, z: 0 };
    k.facing = outward(team) > 0 ? 0 : Math.PI;
    if (team !== defending) k.pos = { x: goalX(team) + outward(team), z: 0 };
    else if (sp.kind === "penalty") k.pos = { x: goalX(team) + outward(team) * KEEPER.lineGap, z: 0 };
    else {
      const home = keeperHome(state, k);
      const far = sp.wall.length > 0 ? -(Math.sign(sp.spot.z) || 1) * 0.5 : 0;
      k.pos = { x: home.x, z: clamp(home.z + far, -(PITCH.goalHalfWidth - 0.4), PITCH.goalHalfWidth - 0.4) };
      k.facing = Math.atan2(sp.spot.z - k.pos.z, sp.spot.x - k.pos.x);
    }
  }
}

/**
 * The scene switches to the kick: the ball on its spot, the taker behind
 * it, the wall lined up, the keeper set and everyone else in place.
 */
export function setupSetPiece(state: MatchState, foul: Foul): void {
  const spot = spotFor(foul);
  const defending = other(foul.team);
  const taker = chooseTaker(state, foul, spot);
  for (const a of state.athletes) reset(a);
  const ball = newBall();
  ball.pos = { x: spot.x, y: BALL.radius, z: spot.z };
  ball.lastTouch = { team: foul.team, id: taker.id };
  state.ball = ball;
  state.flight = null;
  const sp: SetPiece = {
    kind: foul.kind, team: foul.team, taker: taker.id, spot, stage: "aim", stageT: 0, t: 0,
    aim: 0, curve: 0, target: { y: 0.9, z: 0 }, held: 0, holding: false, power: 0, wall: [], path: [],
  };
  const wall = foul.kind === "free" && wantsWall(spot, defending) ? wallMembers(state, sp) : [];
  placeWall(sp, wall);
  sp.wall = wall.map((a) => a.id);
  // The taker stands back from the ball for the run up, off to the side of the kicking foot.
  const toGoal = norm(sub({ x: goalX(defending), z: 0 }, spot));
  taker.pos = onPitch({ x: spot.x - toGoal.x * SET_KICK.runUp, z: spot.z - toGoal.z * SET_KICK.runUp });
  taker.facing = Math.atan2(toGoal.z, toGoal.x);
  placeOthers(state, sp, new Set([taker.id, ...sp.wall]));
  placeKeepers(state, sp);
  const r = state.referee;
  r.pos = onPitch({ x: spot.x + toGoal.x * 3 - toGoal.z * 4, z: spot.z + toGoal.z * 3 + toGoal.x * 4 });
  r.vel = { x: 0, z: 0 };
  r.target = null;
  setRefereeAction(r, "point");
  sp.path = previewPath(sp);
  state.setPiece = sp;
  state.foul = null;
  state.phase = "setpiece";
  state.phaseT = 0;
  state.events.push({ type: "whistle", long: false }, { type: "setpiece", kind: sp.kind, team: sp.team, taker: taker.id });
}
