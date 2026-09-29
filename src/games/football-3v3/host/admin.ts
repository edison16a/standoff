import { registerAdminActions } from "@/platform/admin/admin-actions";
import type { MatchDriver } from "./match-driver";

/**
 * Football's shortcuts in the host's hidden admin panel, for the team
 * with the ball: score a touchdown, line up a field goal, go for two, or
 * win the game and go straight to the trophy.
 * Registered while a game runs; the returned function removes them.
 */
export function registerFootballAdmin(driver: () => MatchDriver | null): () => void {
  return registerAdminActions("football-3v3", [
    { id: "touchdown", label: "Touchdown", run: () => driver()?.admin("touchdown") },
    { id: "field-goal", label: "Field goal", run: () => driver()?.admin("fieldGoal") },
    { id: "two-point", label: "Two point try", run: () => driver()?.admin("twoPoint") },
    { id: "win", label: "Win the game", run: () => driver()?.admin("win") },
  ]);
}
