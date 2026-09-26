"use client";
import { playerColor } from "@/games/kit/players";
import { SplitMap } from "@/games/kit/split/SplitMap";
import type { OwnView } from "../../render/views";
import { useScreenAspect } from "./use-screen-aspect";

/**
 * Which half is whose, top right while the screen is split: each
 * player's name in the pane their view is drawn in, in the colour the
 * camera screens gave them.
 */
export function PlayerMap({ panes }: { panes: readonly OwnView[] }) {
  const aspect = useScreenAspect();
  const cells = panes.map(({ id, rect }) => ({ name: `Player ${id + 1}`, color: playerColor(id + 1), rect }));
  return (
    <div className="bx-map">
      <SplitMap panes={cells} aspect={aspect} />
    </div>
  );
}
