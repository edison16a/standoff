"use client";
import { useEffect, useRef } from "react";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { PedestalScene } from "@/games/brawl-battle/host/components/results/pedestal-scene";
import { PodiumScene } from "@/games/magic-kart/host/components/results/podium-scene";

/**
 * The winners' scenes of Magic Kart and Brawl Battle with sample
 * players, for looking at them without playing a whole race or match.
 * Development only.
 */
export function GameScenes({ game }: { game: "kart" | "brawl" }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const scene =
      game === "kart"
        ? new PodiumScene(el, [
            { place: 1, character: "blaze", colour: "#ef4444" },
            { place: 2, character: "pip", colour: "#22c55e" },
            { place: 3, character: "nova", colour: "#3b82f6" },
          ])
        : new PedestalScene(el, "samurai", ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b"]);
    return () => scene.dispose();
  }, [game]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <div ref={holder} style={{ position: "absolute", inset: 0 }} />
      <VictoryOverlay
        eyebrow={game === "kart" ? "Beach winner" : "Winner"}
        names={[{ name: "Edison", colour: "#ef4444" }]}
        subtitle={game === "kart" ? "Flame Rod, 1:23.45" : "Samurai, last one standing"}
        placings={[
          { place: 1, name: "Edison", colour: "#ef4444", detail: "1:23.45" },
          { place: 2, name: "Maya", colour: "#22c55e", detail: "1:25.02" },
          { place: 3, name: "Computer", colour: "#3b82f6", detail: "1:27.80" },
        ]}
      >
        <button type="button" className="btn btn--primary btn--lg">
          Play again
        </button>
      </VictoryOverlay>
    </div>
  );
}
