import { checkpointSpacing, lapsDone } from "./race";
import { RACE } from "./tuning";
import type { RaceWorld } from "./world";

/**
 * Test shortcuts for the host's admin panel. They only move the lap
 * bookkeeping, so the race carries on and ends the normal way.
 */

/** Puts every kart on the final lap, keeping the gaps between them. */
export function jumpToFinalLap(world: RaceWorld): void {
  if (world.phase !== "racing") return;
  // Everyone skips the same number of laps as the leader, so the order holds.
  const leader = Math.max(...world.karts.filter((k) => !k.race.finished).map(lapsDone));
  const skip = RACE.laps - 1 - leader;
  if (skip <= 0) return;
  for (const kart of world.karts) {
    if (kart.race.finished) continue;
    kart.race.checkpoints += skip * RACE.checkpoints;
    kart.race.progress += skip * RACE.checkpoints * checkpointSpacing(world.track);
  }
}

/** Sends every kart over the line in the order they are in now. The next step ends the race. */
export function finishInPlace(world: RaceWorld): void {
  if (world.phase !== "racing") return;
  const home = world.karts.filter((k) => k.race.finished).length;
  const rest = world.standings.filter((k) => !k.race.finished);
  // A beat apart, so the results show real looking gaps.
  rest.forEach((kart, i) => {
    kart.race.finished = true;
    kart.race.finishTime = world.time + i * 0.5;
    kart.race.place = home + i + 1;
  });
}
