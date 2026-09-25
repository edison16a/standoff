"use client";
import { useEffect, useRef } from "react";
import { frameFor } from "../../render/camera/shots";
import { MatchRenderer } from "../../render/match-renderer";
import { testHooks } from "../test-hooks";
import { useSession } from "./session-context";

/**
 * The 3D view, filling the window. One animation frame loop advances the
 * session (the match, or the demo behind the lobby) and draws it with
 * the broadcast director's camera.
 */
export default function PitchCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new MatchRenderer(canvas, { quality: testHooks().lowGpu ? "low" : "high" });
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    renderer.setLabels((id) => session.label(id));
    renderer.onFirework(() => session.audio.firework());
    // Browser tests steer the test phones by reading the match from here. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __fifa: session });

    let frame = 0;
    const loop = (now: number) => {
      const events = session.tick(now);
      const view = session.view;
      for (const event of events) renderer.onEvent(event, view);
      const framing = frameFor(view, { lobby: !session.driver, replay: session.replay, goals: session.goalCount });
      renderer.draw(view, framing.shot, now, framing.focus, framing.tags);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [session]);

  return <canvas ref={canvasRef} className="fifa-canvas" />;
}
