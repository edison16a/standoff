import { registerAdminActions, type AdminAction } from "@/platform/admin/admin-actions";
import { POWER_NAMES } from "../engine/powers";
import type { Run } from "../engine/run";
import { ZONE_LENGTH } from "../engine/tuning";
import { POWER_KINDS } from "../engine/types";

/** Seconds of passing through things after a skip, so the runner never lands inside a train. */
const SKIP_GHOST_S = 1.5;

/**
 * Test shortcuts for the host's hidden admin panel while a run is going:
 * any power up at once, and a jump ahead to the next zone of the yard.
 * `current` gives the run on screen now, or null between runs.
 */
export function adminShortcuts(current: () => Run | null): AdminAction[] {
  const live = (act: (run: Run) => void) => () => {
    const run = current();
    if (run && !run.crashed) act(run);
  };
  return [
    ...POWER_KINDS.map((kind) => ({ id: `power-${kind}`, label: POWER_NAMES[kind], run: live((run) => run.powers.start(kind)) })),
    {
      id: "next-zone",
      label: "Next zone",
      run: live((run) => {
        const s = run.runner;
        s.distance = (Math.floor(s.distance / ZONE_LENGTH) + 1) * ZONE_LENGTH + 5;
        s.ghost = SKIP_GHOST_S;
        run.course.ensure(s.distance);
      }),
    },
  ];
}

/** Puts the shortcuts in the admin panel. Call the returned function to take them out. */
export function registerRunAdmin(current: () => Run | null): () => void {
  return registerAdminActions("subway-surfers", adminShortcuts(current));
}
