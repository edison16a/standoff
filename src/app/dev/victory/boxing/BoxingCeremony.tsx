"use client";
import { useEffect, useRef } from "react";
import type { BoxingHost } from "@/games/boxing/host/boxing-host";
import { Results } from "@/games/boxing/host/components/Results";
import { SessionContext } from "@/games/boxing/host/components/session-context";
import { useBoxingStore } from "@/games/boxing/host/host-store";
import { stopFight } from "@/games/boxing/engine/shortcuts";
import { Director } from "@/games/boxing/render/director";
import { lookFor } from "@/games/boxing/render/models/looks";
import { DemoFight } from "@/games/boxing/showcase/demo-fight";
import "@/games/boxing/styles/host.css";
import "@/games/boxing/styles/results.css";

const STATS = { landed: 14, thrown: 31, blocked: 6, dodged: 3, counters: 2, knockdowns: 1 };

/** A stand in session: the buttons only need something to call. */
const session = { rematch() {}, newBoxers() {}, menu() {} } as unknown as BoxingHost;

/**
 * Boxing's winner's ceremony on its own, from a short demo fight that is
 * stopped for red, under the game's own results. The same Director the
 * game draws with. Development only.
 */
export function BoxingCeremony() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    useBoxingStore.setState({
      players: 1,
      picks: [0, 1],
      result: { winner: 0, method: "TKO", round: 1, second: 3, cards: [[10, 9]], totals: [10, 9], names: ["Edison", "Computer"], stats: [STATS, { ...STATS, landed: 5, knockdowns: 0 }] },
    });
    const director = new Director(canvas, [lookFor(0, "Edison"), lookFor(1, "Computer")]);
    director.resize(canvas.clientWidth, canvas.clientHeight, 1);
    const fight = new DemoFight(5);
    fight.step(3000);
    stopFight(fight.match, 0);
    for (const event of fight.step(20)) director.onEvent(event, fight.match);
    const start = performance.now();
    // `?step` moves the clock a thirtieth of a second per frame, so slow software rendering still shows every stage of the lift. `?step=0.1` moves it that many seconds.
    const params = new URLSearchParams(window.location.search);
    const stepped = params.has("step");
    const stepMs = Math.min(100, Number(params.get("step")) * 1000 || 1000 / 30);
    let frame = 0;
    let frames = 0;
    const loop = (real: number) => {
      const now = stepped ? start + ++frames * stepMs : real;
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
    <SessionContext.Provider value={session}>
      <div className="bx-stage" style={{ position: "fixed", inset: 0, background: "#000" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <Results />
      </div>
    </SessionContext.Provider>
  );
}
