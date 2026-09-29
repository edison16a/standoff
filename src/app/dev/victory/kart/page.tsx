"use client";
import { useEffect, useRef } from "react";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { PodiumScene } from "@/games/magic-kart/host/components/results/podium-scene";

/** Magic Kart's podium with sample drivers, without racing. Development only. */
export default function KartPodiumPage() {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = holder.current;
    if (!el || process.env.NODE_ENV === "production") return;
    const scene = new PodiumScene(el, [
      { place: 1, character: "blaze", colour: "#ef4444" },
      { place: 2, character: "pip", colour: "#22c55e" },
      { place: 3, character: "nova", colour: "#3b82f6" },
    ]);
    return () => scene.dispose();
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <div ref={holder} style={{ position: "absolute", inset: 0 }} />
      <VictoryOverlay
        eyebrow="Beach winner"
        names={[{ name: "Edison", colour: "#ef4444" }]}
        subtitle="Flame Rod, 1:23.45"
        placings={[
          { place: 1, name: "Edison", colour: "#ef4444", detail: "1:23.45" },
          { place: 2, name: "Maya", colour: "#22c55e", detail: "1:25.02" },
          { place: 3, name: "Computer", colour: "#3b82f6", detail: "1:27.80" },
        ]}
      >
        <button type="button" className="btn btn--primary btn--lg">
          Race again
        </button>
      </VictoryOverlay>
    </div>
  );
}
