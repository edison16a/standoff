import type { MatchEvent } from "../engine/events";
import type { MatchState } from "../engine/types";
import type { BuzzKind } from "../protocol";

/**
 * Which phones buzz for an event, and how: the player who kicked, the
 * one who got the ball, both sides of a tackle, everyone for goals and
 * whistles.
 */
export function buzzFor(event: MatchEvent, state: MatchState): [number, BuzzKind][] {
  const seatOf = (id: number | null) => (id === null ? null : (state.athletes[id]?.seat ?? null));
  const humans = state.athletes.filter((a) => a.seat !== null);
  const one = (id: number | null, kind: BuzzKind): [number, BuzzKind][] => {
    const seat = seatOf(id);
    return seat === null ? [] : [[seat, kind]];
  };
  switch (event.type) {
    case "shot":
      return one(event.athlete, "kick");
    case "pass":
      return one(event.athlete, "pass");
    case "control":
      return one(event.athlete, "ball");
    case "skillResult":
      return event.result === "beat" ? one(event.athlete, "pass") : [...one(event.athlete, "tackled"), ...one(event.defender, "tackle")];
    case "tackle":
      return [...one(event.athlete, "tackle"), ...one(event.victim, "tackled")];
    case "goal":
      return humans.map((a) => [a.seat!, a.team === event.team ? "goal" : "conceded"]);
    case "whistle":
      return humans.map((a) => [a.seat!, "whistle"]);
    case "fulltime":
      return humans.map((a) => [a.seat!, a.team === event.winner ? "win" : "lose"]);
    default:
      return [];
  }
}
