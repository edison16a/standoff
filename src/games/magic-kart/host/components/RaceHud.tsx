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
  // Where the overview goes: the spare quadrant with three players, else
  // top centre between the views, over sky and clear of every view's corners.
  const place = views.length === 3 ? "quad" : views.length >= 2 ? "top" : "corner";

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
