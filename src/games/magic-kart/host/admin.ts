import { registerAdminActions } from "@/platform/admin/admin-actions";
import { fillHands, finishInPlace, jumpToFinalLap } from "../engine/shortcuts";
import type { RaceDriver } from "./race-driver";

/**
 * Test shortcuts in the host's hidden admin panel while a race runs: fill
 * every hand with two power ups to try the queue, jump to the final lap
 * to drive the finish for real, or end the race at once to see the
 * podium. Returns the function that removes them.
 */
export function registerRaceAdmin(driver: RaceDriver): () => void {
  return registerAdminActions("magic-kart", [
    { id: "items", label: "Two power ups each", run: () => fillHands(driver.world) },
    { id: "final-lap", label: "Final lap", run: () => jumpToFinalLap(driver.world) },
    { id: "finish", label: "Finish the race", run: () => finishInPlace(driver.world) },
  ]);
}
