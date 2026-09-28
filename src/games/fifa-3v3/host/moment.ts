import type { MatchState } from "../engine/types";
import { TEAMS } from "../teams";
import type { Moment } from "./host-store";

/**
 * The stoppage shown on the score bug, so a foul reads without any
 * banner across the picture: the foul and the booking while the
 * referee deals with it, then the free kick or penalty being taken.
 */
export function momentOf(match: MatchState, nameOf: (id: number) => string): Moment | null {
  const foul = match.foul;
  if (match.phase === "foul" && foul) {
    return { text: foul.penalty ? "Foul in the box" : "Foul", sub: nameOf(foul.by), card: foul.carded, colour: "#facc15" };
  }
  const sp = match.setPiece;
  if (sp && (match.phase === "setpiece" || !sp.launched || sp.struckT < 1.2)) {
    return { text: sp.kind === "penalty" ? "Penalty" : "Free kick", sub: nameOf(sp.taker), card: false, colour: TEAMS[sp.team].color };
  }
  return null;
}
