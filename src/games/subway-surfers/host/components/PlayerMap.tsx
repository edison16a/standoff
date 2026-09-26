"use client";
import { playerColor } from "@/games/kit/players";
import { SplitMap } from "@/games/kit/split/SplitMap";
import { splitScreen } from "../../render/split";
import type { RunnerHud } from "../store";
import { useScreenAspect } from "./use-screen-aspect";

/**
 * Which half is whose, top right under the tools while two players run
 * side by side: each name in the pane their run is drawn in, in their
 * colour, on the very rects the canvas uses.
 */
export function PlayerMap({ hud }: { hud: readonly RunnerHud[] }) {
  const aspect = useScreenAspect();
  const rects = splitScreen(hud.length);
  const panes = hud.map((h, i) => ({ name: h.name, color: playerColor(h.slot), rect: rects[i]! }));
  return (
    <div className="ss-map">
      <SplitMap panes={panes} aspect={aspect} />
    </div>
  );
}
