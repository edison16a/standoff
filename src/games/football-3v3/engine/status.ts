import { isDown } from "./body";
import type { Match } from "./match";
import { canThrow } from "./passing";
import { canRun, qbRunning } from "./qb-run";
import { canPitch } from "./run-play";
import { RULES } from "./tuning";
import type { ConversionCall, Phase, PlayCall, Role, TeamId } from "./types";

/**
 * Which control layout a phone shows. The QB pad has the move stick,
 * throw stick, juke, run and hike; runners run, dive and juke; the defence
 * moves, rushes, tackles and guards; the kicker gets the two meters.
 */
export type Pad = "qb" | "runner" | "defense" | "kicker" | "choose" | "wait";

export interface SeatStatus {
  athlete: number;
  team: TeamId;
  role: Role;
  onOffense: boolean;
  phase: Phase;
  pad: Pad;
  /** The pick to make and the seconds left to make it, when it is this phone's pick. */
  choose: { options: readonly (PlayCall | ConversionCall)[]; left: number } | null;
  /** Seconds left in the hike window, for the QB. */
  hikeLeft: number | null;
  /** The meter to stop and how long it has run, so the phone can draw it in step with the match. */
  meter: { stage: "aim" | "power"; t: number } | null;
  withBall: boolean;
  canThrow: boolean;
  /** This play is a run call: the QB has Pass for the pitch instead of the throw stick. */
  runPlay: boolean;
  canPitch: boolean;
  /** The QB can still press Run and become the runner. */
  canRun: boolean;
  jukeReady: boolean;
  rushReady: boolean;
  guarding: boolean;
  down: boolean;
}

function padFor(m: Match, id: number, onOffense: boolean, withBall: boolean): Pad {
  const a = m.athlete(id)!;
  const k = m.kick;
  if (m.phase === "kick") return k && k.kicker === id && (k.stage === "aim" || k.stage === "power") ? "kicker" : "wait";
  // The defence never picks, so its pad stays up while the offense calls the play.
  if (m.phase === "choose" || m.phase === "convert") return !onOffense ? "defense" : a.role === "qb" ? "choose" : "wait";
  if (m.phase !== "presnap" && m.phase !== "live") return "wait";
  // A QB who pressed Run gets the runner's pad: the stick, Juke and Dive.
  if (withBall && (a.role !== "qb" || qbRunning(m))) return "runner";
  if (withBall || (onOffense && a.role === "qb")) return "qb";
  if (onOffense && !m.play?.intercepted) return "runner";
  return "defense";
}

/** What a phone should show for the player it plays, or null for a phone with no player. */
export function seatStatus(m: Match, seat: number): SeatStatus | null {
  const a = m.bySeat(seat);
  if (!a) return null;
  const onOffense = a.team === m.offense;
  const withBall = m.carrier()?.id === a.id;
  const pad = padFor(m, a.id, onOffense, withBall);
  const k = m.kick;
  const options: readonly (PlayCall | ConversionCall)[] = m.phase === "convert" ? ["kick", "two"] : ["throw", "run", "kick"];
  return {
    athlete: a.id, team: a.team, role: a.role, onOffense, phase: m.phase, pad,
    choose: pad === "choose" ? { options, left: Math.max(0, RULES.chooseSeconds - m.phaseT) } : null,
    hikeLeft: m.phase === "presnap" && pad === "qb" ? Math.max(0, RULES.hikeSeconds - m.phaseT) : null,
    meter: pad === "kicker" && k && (k.stage === "aim" || k.stage === "power") ? { stage: k.stage, t: k.t } : null,
    withBall,
    canThrow: canThrow(m, a),
    runPlay: m.play?.call === "run",
    canPitch: canPitch(m, a),
    canRun: canRun(m, a),
    jukeReady: a.jukeCd <= 0,
    rushReady: a.rushCd <= 0,
    guarding: a.guard !== null,
    down: isDown(a),
  };
}
