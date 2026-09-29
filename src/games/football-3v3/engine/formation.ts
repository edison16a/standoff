import { attackSign, other } from "../teams";
import { newBall } from "./ball";
import { FIELD } from "./field";
import { setLinemen } from "./linemen";
import { layRoute, pickPlay } from "./routes";
import { BALL, KICK } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, v2, v3, type Vec2 } from "./vec";

/** Runners split out this wide, and defenders line up this deep. */
const SPLIT = 9;
const COVER_DEPTH = 6;
/** The spare defender sets up just off the ball, where he can rush or drop back. */
const SPARE_DEPTH = 3.5;
const SHOTGUN = 5;

export function offenseOf(state: MatchState): Athlete[] {
  return state.athletes.filter((a) => a.team === state.drive.offense);
}

export function defenseOf(state: MatchState): Athlete[] {
  return state.athletes.filter((a) => a.team !== state.drive.offense);
}

/** The side's quarterback. Every side has one. */
export function quarterback(state: MatchState, team = state.drive.offense): Athlete {
  return state.athletes.find((a) => a.team === team && a.role === "qb")!;
}

function reset(a: Athlete, pos: Vec2, facing: number): void {
  a.pos = pos;
  a.vel = v2();
  a.facing = facing;
  a.action = "stance";
  a.actionT = 0;
  a.actionLen = 0;
  a.juke.kind = null;
  a.juke.wait = 0;
  a.juke.heat = 0;
  a.tackleWait = 0;
  a.guard = { held: false, mark: null };
  a.rush = false;
  a.block = { held: 0, through: false };
  a.route = null;
  a.brain.thinkIn = 0;
  a.brain.react = 0;
  a.brain.scramble = false;
}

const wide = (z: number) => clamp(z, -FIELD.halfWidth + 3, FIELD.halfWidth - 3);

/**
 * Everyone in their spots for the next snap: the linemen at the ball, the
 * quarterback in the shotgun, runners split wide either side, and on
 * defence a man over each runner with the spare man just off the ball.
 */
export function setFormation(state: MatchState): void {
  const { offense, los, ballZ } = state.drive;
  const s = attackSign(offense);
  const face = s > 0 ? 0 : Math.PI;
  const off = offenseOf(state);
  const runners = off.filter((a) => a.role === "runner");
  const qb = quarterback(state);
  reset(qb, v2(los - s * SHOTGUN, ballZ), face);
  // One runner goes to the wide side of the field, two go either side.
  const sides = runners.length === 1 ? [ballZ > 0 ? -1 : 1] : [-1, 1];
  const spots = runners.map((r, i) => {
    const spot = v2(los - s * 1, wide(ballZ + (sides[i] ?? 1) * SPLIT));
    reset(r, spot, face);
    return spot;
  });
  const defenders = defenseOf(state);
  // The defence's runners cover first; the quarterback is the spare man, set to rush or drop.
  const covers = [...defenders.filter((d) => d.role === "runner"), ...defenders.filter((d) => d.role === "qb")];
  covers.forEach((d, i) => {
    const spot = spots[i];
    const pos = spot ? v2(los + s * COVER_DEPTH, spot.z) : v2(los + s * (SPARE_DEPTH + (i - spots.length) * 4), ballZ);
    reset(d, pos, face + Math.PI);
  });
  setLinemen(state);
  const ball = newBall();
  ball.pos = v3(los, 0.15, ballZ);
  ball.axis = v3(s, 0, 0);
  state.ball = ball;
}

/** Offensive routes for the play, drawn from the playbook. Computer runners run them; humans run their own. */
export function assignRoutes(state: MatchState): void {
  const { offense, los, ballZ } = state.drive;
  const play = pickPlay(state.rng);
  offenseOf(state)
    .filter((a) => a.role === "runner")
    .forEach((r, i) => (r.route = layRoute(play[i % 2]!, offense, los, ballZ, r.pos)));
}

/** The kicker (the quarterback) steps back to the kicking spot; everyone else stays set. */
export function setKickFormation(state: MatchState): Vec2 {
  const { offense, los, ballZ } = state.drive;
  const qb = quarterback(state);
  const spot = v2(los - attackSign(offense) * KICK.setBack, ballZ);
  qb.pos = v2(spot.x - attackSign(offense) * 1.2, spot.z - 0.6);
  state.ball.pos = v3(spot.x, 0.15, spot.z);
  state.ball.mode = "dead";
  state.ball.axis = v3(0, 1, 0);
  return spot;
}

/** The ball in the center's hands, then flying back to the quarterback. */
export function snapBall(state: MatchState): void {
  const ball = state.ball;
  ball.mode = "snap";
  ball.holder = quarterback(state).id;
  ball.vel = v3();
  ball.pos = v3(state.drive.los, BALL.carryHeight * 0.4, state.drive.ballZ);
}

/** The defending side, for readability at call sites. */
export function defenseTeam(state: MatchState) {
  return other(state.drive.offense);
}
