import { registerAdminActions } from "@/platform/admin/admin-actions";
import { finishInPlace, jumpToFinalLap } from "../engine/shortcuts";
import type { RaceDriver } from "./race-driver";

/**
 * Test shortcuts in the host's hidden admin panel while a race runs: jump
 * to the final lap to drive the finish for real, or end the race at once
 * to see the podium. Returns the function that removes them.
 */
export function registerRaceAdmin(driver: RaceDriver): () => void {
  return registerAdminActions("magic-kart", [
    { id: "final-lap", label: "Final lap", run: () => jumpToFinalLap(driver.world) },
    { id: "finish", label: "Finish the race", run: () => finishInPlace(driver.world) },
  ]);
}
