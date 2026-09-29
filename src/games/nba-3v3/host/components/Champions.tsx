"use client";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { useNbaStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * Over the trophy ceremony: nothing while the captain holds the trophy
 * at his chest, the winners' own names big across the top as it goes
 * up. A button in the corner brings the box scores in early.
 */
export function Champions() {
  const session = useSession();
  const card = useNbaStore((s) => s.ceremony);
  if (!card || card.stage === "stats") return null;
  return (
    <div className="nba-champions">
      {card.stage === "raised" && <VictoryOverlay eyebrow={card.eyebrow} names={card.names} subtitle={card.subtitle} />}
      {/* Bottom right, clear of the names and of the room's code in the bottom left. */}
      <button type="button" className="btn nba-champions__skip" onClick={() => session.showStats()}>
        Box scores
      </button>
    </div>
  );
}
