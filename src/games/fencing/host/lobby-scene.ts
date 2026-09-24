import type { FencerFrame, StageFrame } from "@/games/fencing/engine/frames";
import { EN_GARDE_X } from "@/games/fencing/engine/rules";
import { SLOTS, type PerSlot } from "@/games/fencing/players";
import type { SeatState } from "./lobby";

/**
 * The strip before the match: each player who has picked a fencer stands
 * on their en garde line, breathing, exactly where the match will start
 * them. So when both are ready the countdown begins on the same picture.
 */
export function lobbyScene(seats: PerSlot<SeatState>, t: number): StageFrame {
  const fencers: FencerFrame[] = [];
  for (const slot of SLOTS) {
    const { pick } = seats[slot];
    if (!pick) continue;
    const facing = slot === 1 ? 1 : -1;
    fencers.push({
      slot, characterId: pick, x: -facing * EN_GARDE_X, facing, pitch: 0, yaw: 0, roll: 0, speed: 0,
      action: "idle", actionMs: 0, parrying: false,
    });
  }
  return { t, fencers };
}
