"use client";
import { useEffect, useRef } from "react";
import { PedestalScene } from "@/games/brawl-battle/host/components/results/pedestal-scene";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";

/** Brawl Battle's winner on the pedestal with a sample fighter, without a match. Development only. */
export default function BrawlPedestalPage() {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = holder.current;
    if (!el || process.env.NODE_ENV === "production") return;
    const scene = new PedestalScene(el, "samurai", ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b"]);
    return () => scene.dispose();
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <div ref={holder} style={{ position: "absolute", inset: 0 }} />
      <VictoryOverlay eyebrow="Winner" names={[{ name: "Edison", colour: "#ef4444" }]} subtitle="Samurai, last one standing" />
    </div>
  );
}
