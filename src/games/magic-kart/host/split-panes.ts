import type { SplitPane } from "@/games/kit/split/SplitMap";
import type { ViewRect } from "../render/layout";
import type { ViewHud } from "./host-store";

/**
 * Each player's name and colour in the rect their view is drawn in. The
 * views and the renderer's karts come from the same list in the same
 * order, so pairing them by index matches the real split.
 */
export function splitPanes(views: readonly ViewHud[], rects: readonly ViewRect[]): SplitPane[] {
  return views.flatMap((view, i) => {
    const rect = rects[i];
    return rect ? [{ name: view.name, color: view.color, rect }] : [];
  });
}
