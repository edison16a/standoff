import { registerAdminActions } from "@/platform/admin/admin-actions";
import type { FightDriver } from "./fight-driver";

/**
 * Test shortcuts in the host's hidden admin panel while a fight runs:
 * either boxer wins on the spot, straight to the winner's ceremony.
 * Returns the function that takes them away again.
 */
export function fightShortcuts(names: readonly [string, string], driver: () => FightDriver | null): () => void {
  return registerAdminActions("boxing", [
    { id: "red-wins", label: `${names[0]} wins now`, run: () => driver()?.finishFor(0) },
    { id: "blue-wins", label: `${names[1]} wins now`, run: () => driver()?.finishFor(1) },
  ]);
}
