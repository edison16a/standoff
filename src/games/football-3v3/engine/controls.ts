import type { Role } from "../roles";
import type { TeamId } from "../teams";
import { gain } from "./field";
import { kickKind } from "./kick";
import { MATCH } from "./tuning";
import type { KickKind, MatchState } from "./types";

/**
 * Which controls a phone shows right now, from the host's point of view.
 * The host sends this down, so the phone never has to know the rules.
 *
 * * `call`: the quarterback picks Kick or Throw (on a try, Kick for one or Throw to go for two).
 * * `hike`: the quarterback's hike button, with the seconds left in its window.
 * * `pocket`: a quarterback with the ball behind the line: move bar, throw stick, juke.
 * * `runner`: run stick, dive and juke, with or without the ball.
 * * `defense`: move, rush, tackle and guard.
 * * `kick`: the kicking bars, for the quarterback who kicks.
 * * `wait`: nothing to press (between plays, a team mate's kick, a celebration).
 */
export type ControlMode = "call" | "hike" | "pocket" | "runner" | "defense" | "kick" | "wait";

export interface SeatControls {
  athlete: number;
  team: TeamId;
  role: Role;
  mode: ControlMode;
  /** The side has the ball. */
  offense: boolean;
  hasBall: boolean;
  /** For `call`: what Kick would do. For `kick`: which kick it is. */
  kick: KickKind | null;
  isTry: boolean;
  /** For `kick`: which bar to stop, and the seconds since it started sweeping. */
  bar: "aim" | "power" | null;
  barT: number;
  /** Seconds left to call or to hike. */
  timeLeft: number;
}

/** The controls for the player on this seat, or null if the seat plays nobody. */
export function seatControls(state: MatchState, seat: number): SeatControls | null {
  const a = state.athletes.find((x) => x.seat === seat);
  if (!a) return null;
  const play = state.play;
  const offense = a.team === state.drive.offense;
  const qb = a.role === "qb" && offense;
  const base: SeatControls = { athlete: a.id, team: a.team, role: a.role, mode: "wait", offense, hasBall: play.carrier === a.id, kick: null, isTry: play.isTry, bar: null, barT: 0, timeLeft: 0 };
  switch (state.phase) {
    case "call":
      return qb ? { ...base, mode: "call", kick: kickKind(state), timeLeft: Math.max(0, MATCH.callWait - state.phaseT) } : base;
    case "presnap":
      if (qb) return { ...base, mode: "hike", timeLeft: Math.max(0, MATCH.hikeWindow - state.phaseT) };
      return offense ? base : { ...base, mode: "defense" };
    case "kick": {
      const k = state.kick;
      if (!k || k.kicker !== a.id || (k.stage !== "aim" && k.stage !== "power")) return { ...base, kick: k?.kind ?? null };
      return { ...base, mode: "kick", kick: k.kind, bar: k.stage, barT: k.t };
    }
    case "live": {
      const attacking = a.team === play.carrierTeam;
      if (!attacking) return { ...base, mode: "defense" };
      const pocket = qb && !play.thrown && !play.intercepted && (play.carrier === a.id || play.carrier === null) && gain(a.team, state.drive.los, a.pos.x) <= 0.5;
      return { ...base, mode: pocket ? "pocket" : "runner" };
    }
    default:
      return base;
  }
}
