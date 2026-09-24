import type { MatchEvent, Seat } from "../engine/events";
import { KINDS } from "../engine/fruit-kinds";
import type { Match } from "../engine/match";
import type { BuzzEvent } from "../protocol";
import { LOBBY_HUD, type RoundHud } from "./host-store";

/** What the overlays show for the round right now, or the lobby when there is none. */
export function roundHud(match: Match | null, nameOf: (seat: Seat) => string): RoundHud {
  if (!match) return LOBBY_HUD;
  return {
    phase: match.phase,
    countdown: match.countdown,
    secondsLeft: Math.ceil(match.secondsLeft),
    standings: match.standings().map(({ seat, score }) => ({ seat, name: nameOf(seat), score, active: match.isActive(seat) })),
    winners: match.phase === "over" ? match.winners() : [],
  };
}

const BUZZ: Partial<Record<MatchEvent["type"], BuzzEvent>> = { slice: "slice", hit: "hit", burst: "hit", bomb: "bomb" };

/** Which phone should buzz for an event, and how, or null for none. */
export function buzzFor(event: MatchEvent): { seat: Seat; buzz: BuzzEvent } | null {
  if (event.type === "score") return event.reason === "combo" ? { seat: event.seat, buzz: "combo" } : null;
  const buzz = BUZZ[event.type];
  if (!buzz || !("body" in event) || !("seat" in event)) return null;
  return { seat: event.seat, buzz: KINDS[event.body.kind].class === "rare" ? "rare" : buzz };
}
