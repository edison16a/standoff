"use client";
import { DifficultyPicker } from "@/games/kit/difficulty/DifficultyPicker";
import { useBladeStore } from "../host-store";

/**
 * How hard the computer fencer plays, along the bottom of the lobby while
 * it holds a seat. The match reads the level live, and it stays for the
 * rematch. Training keeps it standing in guard to practise on.
 */
export function ComputerLevel() {
  const computer = useBladeStore((state) => state.seats[1].computer || state.seats[2].computer);
  const inMatch = useBladeStore((state) => state.hud !== null);
  const level = useBladeStore((state) => state.botLevel);
  if (!computer || inMatch) return null;
  return (
    <div className="computer-level">
      <DifficultyPicker level={level} onChange={(botLevel) => useBladeStore.setState({ botLevel })} />
    </div>
  );
}
