import type { CameraKit } from "@/games/kit/camera";
import type { MirrorInput } from "../render/anim/anim-input";
import type { FightDriver } from "./fight-driver";
import { mirrorFrom } from "./mirror";
import { defenseFrom } from "./player-input";
import { SlipReader } from "./slip";

/** A player missing for this long pauses the fight. A frame or two lost by the tracker never does. */
const AWAY_MS = 600;

/**
 * What the camera sees, fed to the fight every frame: each player's
 * defence, whether they are in view, and their arms for their boxer to
 * copy. Punches arrive separately, as moves from the kit.
 */
export class PlayersFeed {
  readonly mirrors: [MirrorInput | null, MirrorInput | null] = [null, null];
  private readonly missingSince: [number | null, number | null] = [null, null];
  private readonly slips = [new SlipReader(), new SlipReader()] as const;

  /** A new fight: everyone starts out in view. */
  reset(): void {
    this.missingSince.fill(null);
    for (const slip of this.slips) slip.reset();
  }

  defend(driver: FightDriver, kit: CameraKit | null, now: number): void {
    if (!kit) return;
    for (const slot of driver.slots) {
      if (slot === null) continue;
      const moves = kit.moves(slot);
      driver.defend(slot, defenseFrom(moves, kit.body(slot), this.slips[slot - 1]?.update(moves, now)));
      const seen = kit.body(slot) !== null;
      const since = this.missingSince[slot - 1] ?? null;
      this.missingSince[slot - 1] = seen ? null : (since ?? now);
      driver.setPresent(slot, seen || now - (since ?? now) < AWAY_MS, now);
    }
  }

  /** Each player's arms from the camera, sized for their boxer, or null for the computer. */
  mirror(driver: FightDriver, kit: CameraKit | null): readonly [MirrorInput | null, MirrorInput | null] {
    for (const id of [0, 1] as const) {
      const slot = driver.slots[id];
      this.mirrors[id] = slot !== null && kit ? mirrorFrom(kit.body(slot), kit.moves(slot), this.mirrors[id] ?? undefined, this.slips[slot - 1]?.amount) : null;
    }
    return this.mirrors;
  }
}
