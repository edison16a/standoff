import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { BuzzKind } from "../protocol";

/**
 * Which phones buzz for an event, and how: the QB at the snap and the
 * throw, the catcher, both sides of a tackle, everyone for scores,
 * whistles and the final result.
 */
export function buzzFor(event: MatchEvent, m: Match): [number, BuzzKind][] {
  const seatOf = (id: number) => m.athlete(id)?.seat ?? null;
  const people = m.athletes.filter((a) => a.seat !== null && !a.auto);
  const one = (id: number, kind: BuzzKind): [number, BuzzKind][] => {
    const seat = seatOf(id);
    return seat === null ? [] : [[seat, kind]];
  };
  switch (event.type) {
    case "hike":
      return one(event.id, "hike");
    case "throw":
    case "pitch":
      return one(event.id, "throw");
    case "catch":
    case "takePitch":
      return one(event.id, "catch");
    case "intercept":
      return [...one(event.id, "pick"), ...one(event.from, "tackled")];
    case "tackle":
      return [...one(event.by, "tackle"), ...one(event.id, "tackled")];
    case "kick":
      return one(event.id, "kick");
    case "touchdown":
      return people.map((a) => [a.seat!, a.team === event.team ? "touchdown" : "conceded"]);
    case "whistle":
      return people.map((a) => [a.seat!, "whistle"]);
    case "win":
      return people.map((a) => [a.seat!, a.team === event.team ? "win" : "lose"]);
    default:
      return [];
  }
}
