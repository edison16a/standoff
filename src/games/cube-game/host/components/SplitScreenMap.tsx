"use client";
import { useSyncExternalStore } from "react";
import { playerColor } from "@/games/kit/players";
import { SplitMap, type SplitPane } from "@/games/kit/split/SplitMap";
import { splitRects } from "../../render/split";
import { useCubeStore } from "../store";

const subscribe = (change: () => void) => {
  window.addEventListener("resize", change);
  return () => window.removeEventListener("resize", change);
};
const aspectNow = () => window.innerWidth / Math.max(1, window.innerHeight);

/**
 * Which half is whose: the kit's split screen map, drawn from the same
 * rects the renderer splits the screen into, each pane in its player's
 * colour. It sits under the corner logo, over the part of the level the
 * runners have already passed, so it never hides what is coming.
 */
export function SplitScreenMap() {
  const players = useCubeStore((s) => s.hud.length);
  const aspect = useSyncExternalStore(subscribe, aspectNow, () => 16 / 9);
  const panes: SplitPane[] = splitRects(players).map((rect, i) => ({ name: `Player ${i + 1}`, color: playerColor(i + 1), rect }));
  if (panes.length < 2) return null;
  return (
    <div className="cg-split-map">
      <SplitMap panes={panes} aspect={aspect} />
    </div>
  );
}
