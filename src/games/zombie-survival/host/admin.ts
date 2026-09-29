import { registerAdminActions } from "@/platform/admin/admin-actions";
import type { SurvivalGame } from "../engine/game";
import { MAX_HEALTH } from "../engine/pacing";
import { STAGES } from "../engine/stages";

/**
 * Test shortcuts for the host's hidden admin panel while a run is on:
 * win the fight at hand, skip ahead to the next boss, or top up health.
 * Returns the function that takes them away again.
 */
export function registerRunAdmin(game: () => SurvivalGame): () => void {
  const nextBoss = () => {
    const g = game();
    const next = STAGES.find((s) => s.index > g.stage && s.bosses.length > 0);
    if (next) g.jumpTo(next.index);
  };
  return registerAdminActions("zombie-survival", [
    { id: "win", label: "Win this stage", run: () => game().encounter?.wipe() },
    { id: "boss", label: "Skip to the next boss", run: nextBoss },
    { id: "heal", label: "Full health", run: () => void (game().health = MAX_HEALTH) },
  ]);
}
