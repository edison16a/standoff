"use client";
import { useEffect, useRef } from "react";
import { MatchRenderer } from "../../render/match-renderer";
import { testHooks } from "../test-hooks";
import { useSession } from "./session-context";

/**
 * The 3D stadium, filling the window. One animation frame loop advances
 * the session (the game, the replay, or the demo behind the lobby) and
 * draws it, and tells the session which way the camera faces so the
 * phones' sticks follow it.
 */
export default function FieldCanvas() {
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
    renderer.setTags((id) => session.names.tag(id));
    renderer.squad.jerseyName = (id) => session.names.own(id);
    // Browser tests read the game from here to steer the test phones. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __football: session });

    let frame = 0;
    const loop = (now: number) => {
      for (const event of session.tick(now)) renderer.onEvent(event);
      const replay = session.replayFrame;
      const script = session.replays.script;
      renderer.director.setReplay(replay && script ? { camera: replay.segment.camera, passer: script.passer, scorer: script.scorer } : null);
      renderer.setTrace(script?.trace ?? null, replay?.time ?? null);
      renderer.draw(session.view, now);
      session.forward = renderer.director.groundForward();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [session]);

  return <canvas ref={canvasRef} className="fb-canvas" />;
}
