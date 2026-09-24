import { CHARACTER_IDS } from "../characters";
import { FixedStepClock } from "../engine/fixed-step";
import { STEP } from "../engine/tuning";
import { RaceWorld } from "../engine/world";
import { findTrack, type TrackId } from "../tracks";

/**
 * Four computer karts lapping the chosen map behind the lobby, so the map
 * picker shows each map alive rather than as a still. It starts already
 * under way and quietly begins again when it finishes.
 */
export class DemoRace {
  world: RaceWorld;
  private readonly clock = new FixedStepClock();

  constructor(private mapId: TrackId) {
    this.world = DemoRace.make(mapId);
  }

  setMap(mapId: TrackId): void {
    this.mapId = mapId;
    this.world = DemoRace.make(mapId);
  }

  tick(nowMs: number): void {
    const steps = this.clock.stepsFor(nowMs);
    for (let i = 0; i < steps; i++) this.world.step(STEP);
    this.world.drainEvents();
    if (this.world.phase === "over") this.world = DemoRace.make(this.mapId);
  }

  private static make(mapId: TrackId): RaceWorld {
    const world = new RaceWorld(findTrack(mapId), CHARACTER_IDS.map((character) => ({ character, seat: null })));
    for (let i = 0; i < 60 * 6; i++) world.step(STEP);
    world.drainEvents();
    return world;
  }
}
