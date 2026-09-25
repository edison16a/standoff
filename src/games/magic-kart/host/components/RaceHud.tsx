"use client";
import { splitScreen } from "../../render/layout";
import { useKartStore } from "../host-store";
import { Minimap } from "./Minimap";
import { Standings } from "./Standings";
import { ViewHud } from "./ViewHud";
import { WhoPlaysWhere } from "./WhoPlaysWhere";

/**
 * Everything laid over the race: one overlay per player's view, lines
 * between the views, and the overview: the track map, the standings and,
 * with two or more views, a small picture of who plays where.
 */
export function RaceHud() {
  const views = useKartStore((state) => state.views);
  const countdown = useKartStore((state) => state.countdown);
  const laps = useKartStore((state) => state.laps);
  // Under the results card the views' own messages and the map would only clutter it.
  const over = useKartStore((state) => state.phase === "results");
  const rects = splitScreen(views.length);
  // The overview always sits top right: in the spare quadrant with three
  // players, as a compact card over two views, a wider but shorter one over
  // four (their quarters are short), and roomy over a single view.
  const place = views.length === 3 ? "quad" : views.length === 2 ? "compact" : views.length >= 4 ? "grid" : "corner";

  return (
    <div className={`mk-hud ${over ? "mk-hud--over" : ""}`}>
      {views.map((hud, i) => (
        <ViewHud key={hud.kartId} hud={hud} rect={rects[i]!} countdown={countdown} laps={laps} />
      ))}
      {views.length >= 2 && <div className="mk-hud__split mk-hud__split--v" />}
      {views.length >= 3 && <div className="mk-hud__split mk-hud__split--h" />}
      <aside className={`mk-overview mk-overview--${place}`}>
        <Minimap />
        <div className="mk-overview__side">
          <Standings />
          <WhoPlaysWhere views={views} rects={rects} />
        </div>
      </aside>
    </div>
  );
}
