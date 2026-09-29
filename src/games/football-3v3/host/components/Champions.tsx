"use client";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { useFootballStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * Over the trophy presentation: nothing while the captain holds the
 * trophy at his chest, the winners' own names big across the top as it
 * goes up, then the stats take over (see Stage). A button in the corner
 * brings the stats in early.
 */
export function Champions() {
  const session = useSession();
  const card = useFootballStore((s) => s.ceremony);
  if (!card || card.stage === "stats") return null;
  return (
    <div className="fb-champions">
      {card.stage === "raised" && <VictoryOverlay eyebrow={card.eyebrow} names={card.names} subtitle={card.subtitle} />}
      {/* Bottom right, clear of the names and of the room's code in the bottom left. */}
      <button type="button" className="fb-ghost fb-champions__skip" onClick={() => session.showStats()}>
        Stats
      </button>
    </div>
  );
}
