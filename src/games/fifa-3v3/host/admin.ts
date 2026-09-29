import { registerAdminActions } from "@/platform/admin/admin-actions";
import { isHuman } from "../engine/athlete";
import { forceFoul } from "../engine/fouls";
import { setupSetPiece } from "../engine/set-piece-setup";
import type { MatchState, SetPieceKind } from "../engine/types";
import type { TeamId } from "../teams";
import type { MatchDriver } from "./match-driver";

/**
 * Shortcuts in the host's hidden admin panel, so fouls, free kicks and
 * penalties can be tried without playing for them. They go to the side
 * of the first phone in the match, or to Red when only computers play.
 */
export function registerTestActions(driver: MatchDriver): () => void {
  const side = (state: MatchState): TeamId => state.athletes.find(isHuman)?.team ?? 0;
  const foul = (kind: SetPieceKind) => driver.queue((state) => void forceFoul(state, side(state), kind));
  // Straight to the kick, skipping the whistle and the referee.
  const kick = (kind: SetPieceKind) =>
    driver.queue((state) => {
      if (!forceFoul(state, side(state), kind) || !state.foul) return;
      state.events = [];
      setupSetPiece(state, state.foul);
    });
  return registerAdminActions("fifa-3v3", [
    { id: "foul", label: "Foul (whistle, referee, free kick)", run: () => foul("free") },
    { id: "foul-box", label: "Foul in the box (whistle, referee, penalty)", run: () => foul("penalty") },
    { id: "free-kick", label: "Free kick (straight to the kick)", run: () => kick("free") },
    { id: "penalty", label: "Penalty (straight to the kick)", run: () => kick("penalty") },
  ]);
}
