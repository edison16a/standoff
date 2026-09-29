import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { TEAMS, type TeamId } from "../teams";
import type { Callout } from "./host-store";

/** How long a callout stays under the score bug. */
export const CALLOUT_MS = 2600;

const GOLD = "#f5c518";
const team = (id: TeamId) => TEAMS[id].color;

/**
 * The word the score bug shows for a big moment, like a broadcast's
 * lower third: the touchdown and its scorer, a good or missed kick, a
 * pick, a sack, a first down. Everyday plays get nothing.
 */
export function calloutFor(event: MatchEvent, m: Match, nameOf: (id: number) => string): Callout | null {
  switch (event.type) {
    case "touchdown":
      return event.conversion
        ? { text: "Two points", sub: nameOf(event.id), colour: team(event.team) }
        : { text: "Touchdown", sub: nameOf(event.id), colour: team(event.team) };
    case "twoPoint":
      return event.good ? null : { text: "Try fails", sub: null, colour: "#94a3b8" };
    case "fieldGoal":
      if (event.conversion) return { text: event.good ? "Extra point" : "No good", sub: null, colour: event.good ? team(event.team) : "#94a3b8" };
      return { text: event.good ? "Field goal" : "No good", sub: event.good ? `${event.yards} yards` : null, colour: event.good ? team(event.team) : "#94a3b8" };
    case "punt":
      return { text: "Punt", sub: `${event.yards} yards`, colour: team(event.team) };
    case "intercept":
      return { text: "Interception", sub: nameOf(event.id), colour: team(m.athlete(event.id)?.team ?? 0) };
    case "tackle":
      return event.sack ? { text: "Sack", sub: nameOf(event.by), colour: team(m.athlete(event.by)?.team ?? 0) } : null;
    case "firstDown":
      return { text: "First down", sub: null, colour: GOLD };
    case "turnoverOnDowns":
      return { text: "Turnover on downs", sub: null, colour: "#94a3b8" };
    case "safety":
      return { text: "Safety", sub: null, colour: team(event.team) };
    case "quarterEnd":
      return { text: `End of the ${["first", "second", "third", "fourth"][event.quarter - 1] ?? "extra"} quarter`, sub: null, colour: GOLD };
    case "overtime":
      return { text: "Overtime", sub: "Next score wins", colour: GOLD };
    default:
      return null;
  }
}
