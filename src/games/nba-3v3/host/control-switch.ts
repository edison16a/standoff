import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";

/** A phone that should now move another player. */
export interface Switch {
  seat: number;
  to: number;
}

/**
 * Who a phone may take over: a teammate the computer is playing who is
 * not another person's player. A person's own player, left to the
 * computer after an earlier switch, can be taken back.
 */
function free(m: Match, control: ReadonlyMap<number, number>, seat: number, id: number): boolean {
  const b = m.athletes[id];
  if (!b || !b.auto) return false;
  if ([...control.values()].includes(id)) return false;
  return b.seat === null || b.seat === seat;
}

/** The phone moving this player, if any. */
export function pilotOf(control: ReadonlyMap<number, number>, id: number): number | null {
  for (const [seat, controlled] of control) if (controlled === id) return seat;
  return null;
}

/**
 * Where control goes after a play, like NBA 2K's switch to the ball.
 * A pass caught by a computer teammate hands the passer's phone to the
 * receiver. A steal or a rebound by a computer teammate hands it over
 * too, but only when one person plays on that team, so two friends on
 * one side never swap each other around.
 */
export class ControlSwitch {
  private pass: { from: number; to: number } | null = null;

  onEvent(e: MatchEvent, m: Match, control: ReadonlyMap<number, number>): Switch | null {
    if (e.type === "pass") {
      this.pass = { from: e.from, to: e.to };
      return null;
    }
    if (e.type === "catch") {
      const pass = this.pass;
      this.pass = null;
      if (!pass || pass.to !== e.id) return null;
      const seat = pilotOf(control, pass.from);
      return seat !== null && m.athletes[pass.from]?.team === m.athletes[e.id]?.team && free(m, control, seat, e.id) ? { seat, to: e.id } : null;
    }
    if (e.type === "steal" || e.type === "intercept" || e.type === "rebound") return this.toBall(e.id, m, control);
    return null;
  }

  /** The lone person on a team switches to the teammate who just won the ball. */
  private toBall(id: number, m: Match, control: ReadonlyMap<number, number>): Switch | null {
    const team = m.athletes[id]?.team;
    const seats = [...control].filter(([, c]) => m.athletes[c]?.team === team && !m.athletes[c]?.auto).map(([seat]) => seat);
    if (seats.length !== 1) return null;
    const seat = seats[0]!;
    return free(m, control, seat, id) ? { seat, to: id } : null;
  }
}
