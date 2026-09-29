"use client";
import { useEffect, useRef } from "react";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { stopFight } from "@/games/boxing/engine/shortcuts";
import { Director } from "@/games/boxing/render/director";
import { lookFor } from "@/games/boxing/render/models/looks";
import { DemoFight } from "@/games/boxing/showcase/demo-fight";

/**
 * Boxing's winner's ceremony on its own, from a short demo fight that is
 * stopped for red. The same Director the game draws with. Development only.
 */
export function BoxingCeremony() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = new Director(canvas, [lookFor(0, "Edison"), lookFor(1, "Computer")]);
    director.resize(canvas.clientWidth, canvas.clientHeight, 1);
    const fight = new DemoFight(5);
    fight.step(3000);
    stopFight(fight.match, 0);
    for (const event of fight.step(20)) director.onEvent(event, fight.match);
    const start = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      director.frame({ match: fight.match, shot: "ceremony", shotMs: now - start, humans: [true, false], mirrors: [null, null] }, now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      director.dispose();
    };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <VictoryOverlay eyebrow="Champion" names={[{ name: "Edison", colour: "#ef4444" }]} subtitle="Slugger. Wins by stoppage in round 1 at 0:03." />
    </div>
  );
}
