"use client";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { useFifaStore } from "../host-store";
import { Results } from "./Results";
import { useSession } from "./session-context";

/**
 * Over the trophy ceremony: nothing while the captain holds the cup at
 * his chest, the winners' own names big across the top as it goes up,
 * then the stats. A button in the corner brings the stats in early.
 */
export function Champions() {
  const session = useSession();
  const card = useFifaStore((s) => s.ceremony);
  if (!card) return null;
  if (card.stage === "stats") return <Results />;
  return (
    <div className="fifa-champions">
      {card.stage === "raised" && <VictoryOverlay eyebrow={card.eyebrow} names={card.names} subtitle={card.subtitle} />}
      {/* Bottom right, clear of the names and of the room's code in the bottom left. */}
      <button type="button" className="fifa-ghost fifa-champions__skip" onClick={() => session.showStats()}>
        Stats
      </button>
    </div>
  );
}
