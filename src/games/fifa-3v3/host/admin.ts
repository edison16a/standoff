import { registerAdminActions } from "@/platform/admin/admin-actions";
import type { MatchDriver } from "./match-driver";

/**
 * Soccer's shortcuts in the host's hidden admin panel, so a foul, a free
 * kick and a penalty can be tried without playing for one. Registered
 * while a match runs; the returned function removes them.
 */
export function registerSoccerAdmin(driver: () => MatchDriver | null): () => void {
  return registerAdminActions("fifa-3v3", [
    { id: "foul", label: "Foul", run: () => void driver()?.foul() },
    { id: "free-kick", label: "Free kick", run: () => void driver()?.setPiece("free") },
    { id: "penalty", label: "Penalty", run: () => void driver()?.setPiece("penalty") },
  ]);
}
