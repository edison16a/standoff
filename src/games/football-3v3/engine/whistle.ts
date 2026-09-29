import { CHARACTERS } from "../roster";
import { other } from "../teams";
import { advance, newDrive, type Drive } from "./downs";
import type { PlayEnd } from "./events";
import { spotZ, xToYard } from "./field";
import type { Match } from "./match";
import { addScore } from "./score";
import { RULES } from "./tuning";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/** After a score or a try, the other side gets the ball at its own 25, as after a touchback on the kickoff. */
export const afterScore = (m: Match, scorer: 0 | 1): Drive => newDrive(other(scorer), RULES.driveStart);

/** Stops the play and hands over to the whistle break (or the celebration) with the next drive set. */
export function blowWhistle(m: Match, end: PlayEnd, next: Drive, yards = 0): void {
  if (m.play) m.play.over = true;
  m.lastEnd = end;
  m.nextDrive = next;
  m.phase = end === "touchdown" && !m.drive.conversion ? "touchdown" : "dead";
  m.phaseT = 0;
  m.emit({ type: "whistle", end, yards });
}

/** Credits the yards of a play: passing and receiving after a catch, rushing on a QB run. */
function creditYards(m: Match, carrier: Athlete, yards: number): void {
  const play = m.play;
  if (!play || carrier.team !== m.offense || play.intercepted) return;
  if (play.caughtBy === carrier.id) {
    m.qbOf(carrier.team).stats.passYards += yards;
    carrier.stats.recYards += yards;
  } else if (!play.passed) {
    carrier.stats.rushYards += yards;
  }
}

function touchdown(m: Match, carrier: Athlete): void {
  const d = m.drive;
  carrier.stats.touchdowns++;
  const yards = Math.round(100 - d.los);
  creditYards(m, carrier, carrier.team === d.offense ? yards : 0);
  const pass = m.play?.caughtBy === carrier.id ? m.qbOf(carrier.team).id : null;
  m.emit({ type: "touchdown", team: carrier.team, id: carrier.id, pass, conversion: d.conversion });
  if (d.conversion) {
    m.emit({ type: "twoPoint", team: carrier.team, good: carrier.team === d.offense });
    addScore(m, carrier.team, 2);
  } else {
    m.scorer = carrier.id;
    addScore(m, carrier.team, 6);
  }
  blowWhistle(m, "touchdown", afterScore(m, d.conversion ? d.offense : carrier.team), yards);
  if (!d.conversion) celebrate(m, carrier);
}

/** The scorer and teammates celebrate on their own: a spike or the player's own dance. */
function celebrate(m: Match, scorer: Athlete): void {
  for (const a of m.athletes) {
    if (a.team !== scorer.team || a.role === "lineman") continue;
    const spike = a === scorer && a.character !== null && CHARACTERS[a.character].celebration === "spike";
    a.action = { kind: "celebrate", t: 0, dur: RULES.touchdownSeconds, spike };
  }
}

/**
 * Ends a live play and settles it by the rules: where the ball is
 * spotted, the down, a touchdown, a safety, a touchback after an
 * interception in the end zone, or a failed two point try.
 */
export function endPlay(m: Match, end: PlayEnd): void {
  if (m.phase !== "live" || !m.play || m.play.over) return;
  const d = m.drive;
  const carrier = m.carrier();
  if (end === "incomplete" || !carrier) {
    if (d.conversion) return failedTry(m, "incomplete");
    const { drive, result } = advance(d, d.los, d.ballZ);
    if (result === "turnover") m.emit({ type: "turnoverOnDowns", team: d.offense });
    return blowWhistle(m, "incomplete", drive);
  }
  const team = carrier.team;
  const yl = xToYard(team, carrier.x);
  if (end === "touchdown" || yl >= 100) return touchdown(m, carrier);
  if (d.conversion) return failedTry(m, end);
  if (yl <= 0) {
    // Brought into its own end zone by the offense is a safety; an interception there is a touchback.
    if (team === d.offense) {
      m.emit({ type: "safety", team: other(team) });
      addScore(m, other(team), 2);
      return blowWhistle(m, "safety", newDrive(other(team), RULES.driveStart));
    }
    return blowWhistle(m, "touchback", newDrive(team, RULES.touchback));
  }
  const z = spotZ(carrier.z);
  const yards = team === d.offense ? yl - d.los : 0;
  creditYards(m, carrier, Math.round(clamp(yards, -99, 99)));
  if (team !== d.offense) return blowWhistle(m, end, newDrive(team, yl, z));
  const { drive, result } = advance(d, yl, z);
  if (result === "firstDown") m.emit({ type: "firstDown", team });
  if (result === "turnover") m.emit({ type: "turnoverOnDowns", team });
  blowWhistle(m, end, drive, Math.round(yards));
}

function failedTry(m: Match, end: PlayEnd): void {
  m.emit({ type: "twoPoint", team: m.drive.offense, good: false });
  blowWhistle(m, end, afterScore(m, m.drive.offense));
}
