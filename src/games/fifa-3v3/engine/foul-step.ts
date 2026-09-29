import { FOUL } from "./defence-tuning";
import { cardDue } from "./fouls";
import { playStep } from "./play";
import { refereeArrived, setRefereeAction } from "./referee";
import { setupSetPiece } from "./set-piece-setup";
import type { MatchState } from "./types";

/**
 * After the whistle: play has stopped and the players pull up, the
 * referee runs to the spot and shows the yellow card (for show only,
 * nobody is sent off), then the scene switches to the kick.
 */
export function stepFoul(state: MatchState, dt: number): void {
  // Nobody's buttons count now; the bodies slow down and the ball rolls to a stop.
  playStep(state, new Map(), dt);
  const r = state.referee;
  const foul = state.foul;
  if (!foul) return;
  if (r.action === "run" && cardDue(state, refereeArrived(r))) {
    setRefereeAction(r, "card");
    state.events.push({ type: "card", offender: foul.offender });
  }
  if (r.action === "card" && r.actionT >= FOUL.cardFor) setupSetPiece(state, foul);
}
