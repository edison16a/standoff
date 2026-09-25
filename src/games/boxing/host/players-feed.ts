import type { CameraKit } from "@/games/kit/camera";
import type { MirrorInput } from "../render/anim/anim-input";
import type { FightDriver } from "./fight-driver";
import { HeadReader } from "./head-reader";
import { mirrorFrom } from "./mirror";
import { defenseFrom } from "./player-input";

/** A player missing for this long pauses the fight. A frame or two lost by the tracker never does. */
const AWAY_MS = 600;

/**
 * What the camera sees, fed to the fight every frame: each player's head
 * and gloves, whether they are in view, and their arms for their boxer
 * to copy. Punches arrive separately, as moves from the kit.
 */
export class PlayersFeed {
  readonly mirrors: [MirrorInput | null, MirrorInput | null] = [null, null];
  private readonly missingSince: [number | null, number | null] = [null, null];
  private readonly heads = [new HeadReader(), new HeadReader()] as const;

  /** A new fight: everyone starts out in view. */
  reset(): void {
    this.missingSince.fill(null);
    for (const head of this.heads) head.reset();
  }

  defend(driver: FightDriver, kit: CameraKit | null, now: number): void {
    if (!kit) return;
    for (const slot of driver.slots) {
      if (slot === null) continue;
      const moves = kit.moves(slot);
      const body = kit.body(slot);
      driver.defend(slot, defenseFrom(moves, body, this.heads[slot - 1]?.update(moves, now)));
      const seen = body !== null;
      const since = this.missingSince[slot - 1] ?? null;
      this.missingSince[slot - 1] = seen ? null : (since ?? now);
      driver.setPresent(slot, seen || now - (since ?? now) < AWAY_MS, now);
    }
  }

  /** Each player's arms from the camera, sized for their boxer, or null for the computer. */
  mirror(driver: FightDriver, kit: CameraKit | null): readonly [MirrorInput | null, MirrorInput | null] {
    for (const id of [0, 1] as const) {
      const slot = driver.slots[id];
      this.mirrors[id] = slot !== null && kit ? mirrorFrom(kit.body(slot), this.mirrors[id] ?? undefined) : null;
    }
    return this.mirrors;
  }
}
