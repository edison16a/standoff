"use client";
import { useEffect, useRef, useState } from "react";
import { Director } from "../../render/director";
import { useBoxingStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * The 3D picture, filling the window. One animation frame loop moves the
 * session on and draws it: the demo fight behind the menus, then each
 * player's view of the fight, the replay and the winner.
 */
export default function FightCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Bumped when the browser takes the WebGL context away, which swaps in a fresh canvas.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = new Director(canvas, session.looks());
    director.onReplayImpact = () => session.audio.replayImpact();
    // Browser tests on software WebGL can draw at a lower resolution to keep the fight moving. Development only.
    const testScale = () => (process.env.NODE_ENV === "development" ? (window as unknown as { __boxingRenderScale?: number }).__boxingRenderScale : undefined);
    let scale = testScale();
    const fit = () => director.resize(canvas.clientWidth, canvas.clientHeight, scale ?? (window.devicePixelRatio || 1));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    // Browsers drop the oldest WebGL context when a page holds too many, and a lost canvas stays
    // dark for good. A new canvas gets a new context, so the fight goes on with a picture.
    const onLost = () => setGeneration((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    const unlisten = session.listen((event, match) => director.onEvent(event, match));
    // Browser tests read the fight from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __boxing: session, __boxingDirector: director });

    let fightId = session.fightId;
    let screen = useBoxingStore.getState().screen;
    let frame = 0;
    const loop = (now: number) => {
      if (testScale() !== scale) {
        scale = testScale();
        fit();
      }
      session.tick(now);
      const next = useBoxingStore.getState().screen;
      // A new fight, or the menus again: clear the last fight's replay, sparks and confetti.
      if (session.fightId !== fightId || (next !== screen && (next === "players" || next === "pick"))) director.reset();
      fightId = session.fightId;
      screen = next;
      director.setLooks(session.looks());
      director.frame(session.directorInput(now), now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      unlisten();
      director.dispose();
    };
  }, [session, generation]);

  return <canvas key={generation} ref={canvasRef} className="bx-canvas" />;
}
