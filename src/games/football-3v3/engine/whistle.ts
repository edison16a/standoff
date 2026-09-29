import { other } from "../teams";
import { creditYards } from "./carrier";
import { advanceDowns, driveFrom, newDrive } from "./downs";
import { FIELD, gain, inEndZone, inOwnEndZone, yardsToGoal } from "./field";
import { finish, nextPossession, nextSnap, startTry } from "./flow";
import { addScore } from "./score";
import { carrierOf } from "./tackle";
import { MATCH } from "./tuning";
import type { MatchState } from "./types";

/**
 * The play is over. A carrier brought down in his own end zone gives up a
 * safety, or a touchback after an interception; one who got the ball over
 * the goal line in a dive or a tackle has scored. Otherwise the ball is
 * dead and the chains move after a pause.
 */
export function whistle(state: MatchState): void {
  const play = state.play;
  const c = carrierOf(state);
  if (c && (play.end === "tackle" || play.end === "dive" || play.end === "out")) {
    if (inOwnEndZone(play.carrierTeam, play.spot.x)) play.end = play.intercepted ? "touchback" : "safety";
    else if (inEndZone(play.carrierTeam, play.spot.x) && Math.abs(play.spot.z) <= FIELD.halfWidth) play.end = "touchdown";
  }
  creditYards(state);
  state.events.push({ type: "whistle" });
  state.events.push({ type: "playEnd", end: play.end!, gain: Math.round(gain(state.drive.offense, state.drive.los, play.spot.x)) });
  if (play.end === "touchdown" && c) return touchdown(state);
  if (play.end === "safety") return addScore(state, other(play.carrierTeam), "safety", null);
  state.phase = "dead";
  state.phaseT = 0;
}

function touchdown(state: MatchState): void {
  const play = state.play;
  const c = carrierOf(state)!;
  // A two point conversion is points, not a touchdown on the stat sheet.
  if (!play.isTry) c.stats.touchdowns++;
  const thrower = play.receiver !== null && !play.intercepted ? (state.athletes.find((a) => a.team === c.team && a.role === "qb")?.id ?? null) : null;
  addScore(state, play.carrierTeam, play.isTry ? "twopoint" : "touchdown", c.id, thrower);
}

/** After the pause, the ball is spotted for the next play, or goes over. */
export function resolveDead(state: MatchState): void {
  const play = state.play;
  const offense = state.drive.offense;
  if (play.isTry) return nextPossession(state, other(offense));
  if (play.end === "touchback") state.drive = driveFrom(play.carrierTeam, MATCH.touchback);
  else if (play.intercepted) {
    state.drive = newDrive(play.carrierTeam, play.spot.x, play.spot.z);
    state.events.push({ type: "turnover", team: offense, onDowns: false });
  } else if (play.end === "incomplete") advanceDowns(state, state.drive.los, state.drive.ballZ);
  else advanceDowns(state, play.spot.x, play.spot.z);
  nextSnap(state);
}

/** The celebration is over: to the replay, the try, the next drive, or the end. */
export function afterScore(state: MatchState): void {
  const last = state.lastScore;
  if (!last) return nextSnap(state);
  if (last.kind === "touchdown" && state.options.replays) {
    state.phase = "replay";
    state.phaseT = 0;
    return;
  }
  if (state.winner !== null) return finish(state);
  if (last.kind === "touchdown") return startTry(state, last.team);
  // After a safety the side that scored gets the ball; after anything else the other side does.
  nextPossession(state, last.kind === "safety" ? last.team : other(last.team));
}

/** The replay is over, played through or skipped by everyone. */
export function afterReplay(state: MatchState): void {
  const last = state.lastScore;
  if (state.winner !== null || !last) return finish(state);
  startTry(state, last.team);
}

/** A kick has been judged and its result shown: points, or the ball goes over. */
export function finishKick(state: MatchState): void {
  const kick = state.kick!;
  const kicking = state.drive.offense;
  const receiving = other(kicking);
  if (kick.result === "good" && kick.kind === "fieldgoal") return addScore(state, kicking, "fieldgoal", kick.kicker);
  if (kick.result === "good" && kick.kind === "pat") return addScore(state, kicking, "pat", kick.kicker);
  if (kick.kind === "pat") return nextPossession(state, receiving);
  if (kick.kind === "fieldgoal") {
    // A miss gives the ball back at the line, or the 20 when that is further out.
    const x = state.drive.los;
    state.drive = yardsToGoal(receiving, x) > 100 - MATCH.touchback ? driveFrom(receiving, MATCH.touchback) : newDrive(receiving, x, state.drive.ballZ);
  } else if (kick.result === "touchback" || !kick.landed) state.drive = driveFrom(receiving, MATCH.touchback);
  else state.drive = newDrive(receiving, kick.landed.x, kick.landed.z);
  state.events.push({ type: "turnover", team: kicking, onDowns: false });
  nextSnap(state);
}
