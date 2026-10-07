import { downText } from "../engine/downs";
import type { Match } from "../engine/match";
import { seatStatus } from "../engine/status";
import type { Athlete } from "../engine/types";
import type { PhoneState, RoomPhase, StatLine } from "../protocol";
import type { Callout } from "./host-store";
import type { SeatState } from "./lobby";
import type { SkipVotes } from "./replay/skip";

export interface PhoneContext {
  phase: RoomPhase;
  /** The player's own name. */
  name: string;
  seat: SeatState;
  taken: PhoneState["taken"];
  match: Match | null;
  callout: Callout | null;
  votes: SkipVotes | null;
}

export function statLine(a: Athlete): StatLine {
  const s = a.stats;
  return { passYards: s.passYards, rushYards: s.rushYards, recYards: s.recYards, touchdowns: s.touchdowns, tackles: s.tackles, interceptions: s.interceptions };
}

/** The controls to show: the engine's pick, except that after an interception the QB defends like everyone else on his side. */
function padFor(m: Match | null, status: ReturnType<typeof seatStatus>, replay: boolean): PhoneState["pad"] {
  if (!status || replay) return "wait";
  if (status.pad === "qb" && !status.withBall && m?.play?.intercepted) return "defense";
  return status.pad;
}

function result(m: Match, a: Athlete): PhoneState["result"] {
  if (m.phase !== "over") return null;
  return m.winner === null ? "tie" : m.winner === a.team ? "win" : "lose";
}

/**
 * What one phone shows: its setup, and in a game its side, the score,
 * and exactly the controls its player has right now, straight from the
 * engine's own seat status.
 */
export function phoneState(c: PhoneContext, seatNo: number): PhoneState {
  const m = c.match;
  const a = m?.bySeat(seatNo) ?? null;
  // The player steered now: after a pass to a computer teammate, that teammate.
  const body = (a && m?.steered(seatNo)) ?? a;
  const status = m && a ? seatStatus(m, seatNo) : null;
  const replay = c.phase === "replay";
  const voting = replay && !!c.votes && c.votes.list().some((v) => v.seat === seatNo);
  const kick = m?.kick;
  return {
    kind: "state",
    phase: c.phase,
    name: c.name.slice(0, 40),
    taken: c.taken,
    pick: c.seat.pick,
    ready: c.seat.ready,
    team: a?.team ?? c.seat.team,
    role: body ? (body.role === "qb" ? "qb" : "runner") : c.seat.role,
    playing: a !== null,
    score: m ? [m.score[0], m.score[1]] : [0, 0],
    quarter: m?.quarter ?? 1,
    overtime: m?.overtime ?? false,
    clock: m ? Math.ceil(m.clock) : 0,
    down: m ? downText(m.drive) : "",
    offense: !!m && !!a && a.team === m.offense,
    switched: !!a && !!body && body.id !== a.id,
    pad: padFor(m, status, replay),
    choose: status?.choose && !replay ? { options: [...status.choose.options], left: Math.ceil(status.choose.left) } : null,
    hikeLeft: status?.hikeLeft != null && !replay ? Math.ceil(status.hikeLeft) : null,
    meter: status?.meter && !replay ? { stage: status.meter.stage, fieldGoal: kick?.fieldGoal ?? true } : null,
    withBall: status?.withBall ?? false,
    canThrow: status?.canThrow ?? false,
    runPlay: status?.runPlay ?? false,
    canPitch: status?.canPitch ?? false,
    canRun: status?.canRun ?? false,
    jukeReady: status?.jukeReady ?? false,
    // Steps fine enough for a smooth sweep and bar, coarse enough not to flood the link.
    jukeCool: Math.ceil((status?.jukeCool ?? 0) * 12) / 12,
    stamina: status ? Math.round(status.stamina * 20) / 20 : null,
    rushReady: status?.rushReady ?? false,
    guarding: status?.guarding ?? false,
    grounded: status?.down ?? false,
    banner: c.callout?.text.slice(0, 24) ?? null,
    skip: voting && c.votes ? { agreed: c.votes.has(seatNo), count: c.votes.count, total: c.votes.total } : null,
    result: m && a ? result(m, a) : null,
    stats: a ? statLine(a) : null,
  };
}
