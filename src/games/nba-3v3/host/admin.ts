import { registerAdminActions } from "@/platform/admin/admin-actions";
import { forceFoul } from "../engine/foul-call";
import type { MatchDriver } from "./match-driver";

/**
 * Shortcuts in the host's hidden admin panel, so fouls and free throws
 * can be tried without playing for them. They go to the first person
 * in the game, or to whoever has the ball when only computers play.
 */
export function registerTestActions(driver: MatchDriver): () => void {
  const m = driver.match;
  const person = (): number | null => {
    const first = [...driver.athleteBySeat.values()][0];
    return first ?? null;
  };
  return registerAdminActions("nba-3v3", [
    { id: "foul", label: "Foul (whistle, referee, two shots)", run: () => void forceFoul(m, 2, person()) },
    { id: "free-throws", label: "Free throws (straight to the line)", run: () => void forceFoul(m, 2, person(), false) },
    { id: "and-one", label: "And one (one shot)", run: () => void forceFoul(m, 1, person()) },
    { id: "three-shots", label: "Fouled three (three shots)", run: () => void forceFoul(m, 3, person()) },
    // Both teams one short of the win, so the next basket ends the game and rolls the replay.
    { id: "game-point", label: "Next basket wins (to see the replay)", run: () => void (m.score = [m.target - 1, m.target - 1]) },
  ]);
}
