import { CHARACTERS } from "@/games/blade-clash/characters";
import type { FighterFrame, StageFrame } from "@/games/blade-clash/engine/frames";
import { MAX_HEALTH, START_X } from "@/games/blade-clash/engine/rules";
import { GUARD, swordPose, type SwordControl } from "@/games/blade-clash/engine/sword";
import { SLOTS, type PerSlot } from "@/games/blade-clash/players";
import type { SeatState } from "./lobby";

/**
 * The hall before the fight: each player who has picked a fighter stands
 * on their mark, exactly where the fight will start them, holding their
 * sword the way their phone does. So a player can check their calibration
 * on the big screen, and the countdown begins on the same picture.
 */
export function lobbyScene(seats: PerSlot<SeatState>, holds: PerSlot<SwordControl | null>, t: number): StageFrame {
  const fighters: FighterFrame[] = [];
  for (const slot of SLOTS) {
    const { pick } = seats[slot];
    if (!pick) continue;
    const facing = slot === 1 ? 1 : -1;
    const x = -facing * START_X;
    const control = holds[slot] ?? GUARD;
    fighters.push({
      slot,
      characterId: pick,
      x,
      facing,
      speed: 0,
      health: MAX_HEALTH,
      action: "idle",
      actionMs: 0,
      control,
      sword: swordPose(x, facing, control, CHARACTERS[pick].blade),
      knocked: 0,
    });
  }
  return { t, fighters };
}
