import { SLOTS } from "@/games/blade-clash/players";
import { registerAdminActions } from "@/platform/admin/admin-actions";
import type { MatchDriver } from "./match-driver";

/**
 * Test shortcuts in the host's hidden admin panel while a match runs: land
 * a slash for either player, to see the hit moment and the win without a
 * real duel. Returns the function that removes them.
 */
export function registerBladeAdmin(driver: MatchDriver, names: () => Record<1 | 2, string>): () => void {
  return registerAdminActions(
    "blade-clash",
    SLOTS.map((slot) => ({
      id: `slash-${slot}`,
      get label() {
        return `Point to ${names()[slot]}`;
      },
      run: () => driver.engine.landSlash(slot),
    })),
  );
}
