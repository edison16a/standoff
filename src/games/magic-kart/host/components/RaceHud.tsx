"use client";
import { splitScreen } from "../../render/layout";
import { useKartStore } from "../host-store";
import { Minimap } from "./Minimap";
import { Standings } from "./Standings";
import { ViewHud } from "./ViewHud";

/**
 * Everything laid over the race: one overlay per player's view, lines
 * between the views, and the overall map and standings.
 */
export function RaceHud() {
  const views = useKartStore((state) => state.views);
  const countdown = useKartStore((state) => state.countdown);
  const laps = useKartStore((state) => state.laps);
  const rects = splitScreen(views.length);
  // The overview always sits top right: in the spare quadrant with three
  // players, as a compact card over split views, roomy over a single view.
  const place = views.length === 3 ? "quad" : views.length >= 2 ? "compact" : "corner";

  return (
    <div className="mk-hud">
      {views.map((hud, i) => (
        <ViewHud key={hud.kartId} hud={hud} rect={rects[i]!} countdown={countdown} laps={laps} />
      ))}
      {views.length >= 2 && <div className="mk-hud__split mk-hud__split--v" />}
      {views.length >= 3 && <div className="mk-hud__split mk-hud__split--h" />}
      <aside className={`mk-overview mk-overview--${place}`}>
        <Minimap />
        <Standings />
      </aside>
    </div>
  );
}
