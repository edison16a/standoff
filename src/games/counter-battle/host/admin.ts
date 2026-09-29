import { registerAdminActions } from "@/platform/admin/admin-actions";
import type { TeamId } from "../engine/fighter";
import { TEAMS } from "../teams";
import type { MatchDriver } from "./match-driver";

/**
 * Test shortcuts for the host's hidden admin panel while a match runs:
 * end the round for either side, as if the other team were all splatted.
 * Returns the function that takes them away again.
 */
export function registerMatchAdmin(driver: () => MatchDriver | null): () => void {
  const win = (team: TeamId) => () => {
    const d = driver();
    if (!d || d.battle.match.phase !== "fight") return;
    for (const f of d.battle.fighters) {
      if (f.team === team || !f.alive) continue;
      f.health = 0;
      f.alive = false;
      f.diedAt = d.battle.time;
    }
  };
  return registerAdminActions("counter-battle", [
    { id: "win-0", label: `${TEAMS[0].name} wins the round`, run: win(0) },
    { id: "win-1", label: `${TEAMS[1].name} wins the round`, run: win(1) },
  ]);
}
