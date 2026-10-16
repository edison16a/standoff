import { isDown } from "./body";
import { jukeCooling } from "./juke";
import type { Match } from "./match";
import { canThrow } from "./passing";
import { canRun, qbRunning } from "./qb-run";
import { canPitch } from "./run-play";
import { slotsOpen, throwSlots } from "./throw-targets";
import { pageCards } from "./playbook/card";
import { huddleLeft } from "./playbook/huddle";
import { accuracyOf, pocketPressure } from "./pocket";
import { RULES } from "./tuning";
import type { Athlete, ConversionCall, Phase, PlayCall, Role, TeamId } from "./types";

/**
 * Which control layout a phone shows. The QB pad has the move stick, a
 * throw button per runner, juke, run and hike; runners run, dive and juke; the defence
 * moves, rushes, tackles and guards; the kicker gets the two meters.
 */
export type Pad = "qb" | "runner" | "defense" | "kicker" | "choose" | "playbook" | "wait";

export interface SeatStatus {
  athlete: number;
  team: TeamId;
  role: Role;
  onOffense: boolean;
  phase: Phase;
  pad: Pad;
  /** The pick to make and the seconds left to make it, when it is this phone's pick. */
  choose: { options: readonly (PlayCall | ConversionCall)[]; left: number } | null;
  /** The page of plays a QB picks from after Throw or Run, drawn for his phone (playbook/card.ts). */
  book: (ReturnType<typeof pageCards> & { call: "throw" | "run"; left: number }) | null;
  /** His throwing accuracy under the rush now, 1 to POCKET.floor, while the QB can still throw (pocket.ts). */
  aim: number | null;
  /** Seconds left in the hike window, for the QB. */
  hikeLeft: number | null;
  /** The meter to stop and how long it has run, so the phone can draw it in step with the match. */
  meter: { stage: "aim" | "power"; t: number } | null;
  withBall: boolean;
  canThrow: boolean;
  /** The QB's four throw buttons, left to right in the runners' colours: whether each throws now (throw-targets.ts). Empty off the QB pad. */
  throws: boolean[];
  /** This play is a run call: the QB has Pitch as well as the throw buttons. */
  runPlay: boolean;
  canPitch: boolean;
  /** On a run call, which of the four buttons is the back the pitch goes to. */
  backSlot: number | null;
  /** The QB can still press Run and become the runner. */
  canRun: boolean;
  jukeReady: boolean;
  /** Share of the juke cooldown still to run. */
  jukeCool: number;
  /** How fresh his legs are, 1 to 0 (stamina.ts). */
  stamina: number;
  rushReady: boolean;
  guarding: boolean;
  down: boolean;
}

function padFor(m: Match, id: number, onOffense: boolean, withBall: boolean): Pad {
  const a = m.athlete(id)!;
  const k = m.kick;
  if (m.phase === "kick") return k && k.kicker === id && (k.stage === "aim" || k.stage === "power") ? "kicker" : "wait";
  // The defence never picks, so its pad stays up while the offense calls the play.
  if (m.phase === "choose" || m.phase === "convert") return !onOffense ? "defense" : a.role !== "qb" ? "wait" : m.huddle ? "playbook" : "choose";
  if (m.phase !== "presnap" && m.phase !== "live") return "wait";
  // A QB who pressed Run gets the runner's pad: the stick, Juke and Dive.
  if (withBall && (a.role !== "qb" || qbRunning(m))) return "runner";
  if (withBall || (onOffense && a.role === "qb")) return "qb";
  if (onOffense && !m.play?.intercepted) return "runner";
  return "defense";
}

/** The back's place among the QB's throw buttons on a run call, or null. */
function backSlot(m: Match, qb: Athlete): number | null {
  const back = m.play?.call === "run" ? m.play.back : null;
  const at = back === null ? -1 : throwSlots(m, qb).indexOf(back);
  return at >= 0 ? at : null;
}

/** What a phone should show for the player it steers now, or null for a phone with no player. */
export function seatStatus(m: Match, seat: number): SeatStatus | null {
  const a = m.steered(seat);
  if (!a) return null;
  const onOffense = a.team === m.offense;
  const withBall = m.carrier()?.id === a.id;
  const pad = padFor(m, a.id, onOffense, withBall);
  const k = m.kick;
  const options: readonly (PlayCall | ConversionCall)[] = m.phase === "convert" ? ["kick", "two"] : ["throw", "run", "kick"];
  return {
    athlete: a.id, team: a.team, role: a.role, onOffense, phase: m.phase, pad,
    choose: pad === "choose" ? { options, left: Math.max(0, RULES.chooseSeconds - m.phaseT) } : null,
    book: pad === "playbook" && m.huddle ? { call: m.huddle.call, left: huddleLeft(m.huddle, m.time), ...pageCards(m, m.huddle) } : null,
    aim: pad === "qb" && (m.phase === "presnap" || canThrow(m, a)) ? accuracyOf(m.phase === "presnap" ? 0 : pocketPressure(m, a)) : null,
    hikeLeft: m.phase === "presnap" && pad === "qb" ? Math.max(0, RULES.hikeSeconds - m.phaseT) : null,
    meter: pad === "kicker" && k && (k.stage === "aim" || k.stage === "power") ? { stage: k.stage, t: k.t } : null,
    withBall,
    canThrow: canThrow(m, a),
    throws: pad === "qb" ? slotsOpen(m, a) : [],
    runPlay: m.play?.call === "run",
    canPitch: canPitch(m, a),
    backSlot: backSlot(m, a),
    canRun: canRun(m, a),
    jukeReady: a.jukeCd <= 0,
    jukeCool: jukeCooling(a),
    stamina: a.stamina,
    rushReady: a.rushCd <= 0,
    guarding: a.guard !== null,
    down: isDown(a),
  };
}
