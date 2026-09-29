import { attackSign, other, type TeamId } from "../teams";
import { isHuman, runToward } from "./athlete";
import { botSkill } from "./bot-skill";
import { settle } from "./control";
import { driveFrom, toGo } from "./downs";
import { xFromGoal, yardsToGoal } from "./field";
import { assignRoutes, quarterback, setFormation, snapBall } from "./formation";
import { kickKind, setupKick } from "./kick";
import { KICK, MATCH } from "./tuning";
import type { Command, MatchState, Play, PlayCall } from "./types";
import { clamp } from "./vec";

export function newPlay(offense: TeamId, isTry = false): Play {
  return { call: null, isTry, snapped: false, carrier: null, carrierTeam: offense, gotAt: 0, target: null, pass: null, thrown: false, receiver: null, intercepted: false, end: null, spot: { x: 0, z: 0 } };
}

function enter(state: MatchState, phase: MatchState["phase"]): void {
  state.phase = phase;
  state.phaseT = 0;
}

/** Lines everyone up and waits for the quarterback's call: kick or throw. */
export function beginCall(state: MatchState, isTry = false): void {
  state.play = newPlay(state.drive.offense, isTry);
  state.kick = null;
  setFormation(state);
  enter(state, "call");
  quarterback(state).brain.thinkIn = 0.8 + state.rng.range(0, 0.8);
}

/** The try after a touchdown, from the 2: kick for one or throw for two. */
export function startTry(state: MatchState, team: TeamId): void {
  state.drive = { offense: team, los: xFromGoal(team, MATCH.twoPointLine), ballZ: 0, down: 1, firstDown: xFromGoal(team, 0) };
  beginCall(state, true);
}

/**
 * The computer's call: kick the extra point, now and then go for two;
 * throw on early downs; on fourth, a field goal in range, a throw on
 * fourth and short, else punt.
 */
export function botCall(state: MatchState): PlayCall {
  const d = state.drive;
  if (state.play.isTry) return state.rng.chance(0.2) ? "throw" : "kick";
  if (d.down < 4) return "throw";
  if (kickKind(state) === "fieldgoal") return "kick";
  return toGo(d) <= 2 || yardsToGoal(d.offense, d.los) < 40 ? "throw" : "kick";
}

export function makeCall(state: MatchState, call: PlayCall): void {
  const play = state.play;
  play.call = call;
  const kind = call === "kick" ? kickKind(state) : null;
  state.events.push({ type: "call", team: state.drive.offense, call, kick: kind, isTry: play.isTry });
  if (kind === "pat") {
    // Extra points are snapped from further out than a two point try.
    state.drive = { ...state.drive, los: xFromGoal(state.drive.offense, KICK.patLine) };
    setFormation(state);
  }
  if (kind) return setupKick(state, kind);
  assignRoutes(state);
  enter(state, "presnap");
  quarterback(state).brain.thinkIn = 1 + state.rng.range(0, 1.6);
}

export function stepCall(state: MatchState, commands: ReadonlyMap<number, Command>): void {
  const qb = quarterback(state);
  const asked = isHuman(qb) ? commands.get(qb.id)?.call : state.phaseT >= qb.brain.thinkIn ? botCall(state) : undefined;
  const call = asked ?? (state.phaseT >= MATCH.callWait ? botCall(state) : undefined);
  if (call) makeCall(state, call);
}

/**
 * Before the snap: the quarterback has five seconds to hike, then it is
 * snapped anyway. Human defenders may shuffle about on their side of the
 * ball; the offence stays set.
 */
export function stepPresnap(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  const qb = quarterback(state);
  const s = attackSign(state.drive.offense);
  const neutral = state.drive.los + s * 1.2;
  for (const a of state.athletes) {
    a.actionT += dt;
    if (a.team === state.drive.offense || !isHuman(a)) continue;
    runToward(state, a, commands.get(a.id)?.move ?? { x: 0, z: 0 }, dt);
    // Nobody lines up offside.
    a.pos.x = s > 0 ? Math.max(neutral, a.pos.x) : Math.min(neutral, a.pos.x);
  }
  const hike = isHuman(qb) ? !!commands.get(qb.id)?.hike : state.phaseT >= qb.brain.thinkIn;
  if (hike || state.phaseT >= MATCH.hikeWindow) snap(state, !hike);
}

/** The snap: the ball goes back to the quarterback and the rush is on. */
export function snap(state: MatchState, auto: boolean): void {
  const play = state.play;
  const qb = quarterback(state);
  play.snapped = true;
  play.gotAt = state.drive.los;
  snapBall(state);
  enter(state, "live");
  const skill = botSkill(state);
  qb.brain.throwAt = skill.acts ? state.rng.range(1.3, 2.6) + clamp(skill.reaction, 0, 1) * 0.5 : Infinity;
  qb.brain.thinkIn = 0;
  for (const a of state.athletes) if (a.action === "stance") a.action = "free";
  state.events.push({ type: "hike", team: state.drive.offense, auto });
}

/** The next snap, unless the quarter ran out during the last play. */
export function nextSnap(state: MatchState): void {
  if (!state.overtime && state.clock <= 0) return endQuarter(state);
  beginCall(state);
}

/** A new drive for a team from its own 25, as after a score. */
export function nextPossession(state: MatchState, team: TeamId): void {
  state.drive = driveFrom(team, MATCH.startLine);
  nextSnap(state);
}

/**
 * The end of a quarter. The second half starts with the other side
 * receiving; after the fourth, the leader wins, and a tie goes to sudden
 * death overtime.
 */
export function endQuarter(state: MatchState): void {
  if (state.quarter < MATCH.quarters) {
    state.quarter++;
    state.clock = state.options.quarterSeconds;
    if (state.quarter === 3) state.drive = driveFrom(other(state.openedBy), MATCH.startLine);
  } else if (state.score[0] === state.score[1]) {
    state.overtime = true;
    state.quarter++;
  } else return finish(state);
  state.events.push({ type: "quarter", quarter: state.quarter, overtime: state.overtime });
  enter(state, "quarter");
}

/** The final whistle. */
export function finish(state: MatchState): void {
  if (state.winner === null && state.score[0] !== state.score[1]) state.winner = state.score[0] > state.score[1] ? 0 : 1;
  enter(state, "final");
  for (const a of state.athletes) {
    a.action = a.team === state.winner ? "celebrate" : "dejected";
    a.actionT = 0;
    a.actionLen = MATCH.finalWait;
  }
  state.events.push({ type: "final", winner: state.winner });
}

/** Between plays, bodies slow down and anyone on the grass gets up. */
export function idle(state: MatchState, dt: number): void {
  for (const a of state.athletes) {
    a.actionT += dt;
    settle(a, dt, 4);
    if (a.action === "down" && a.actionT >= a.actionLen) a.action = "free";
  }
}
