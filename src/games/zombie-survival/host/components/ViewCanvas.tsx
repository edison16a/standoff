"use client";
import { useEffect, useRef } from "react";
import { SurvivalRenderer } from "../../render/scene-renderer";
import { exposeForTests } from "../debug";
import { useSession } from "./session-context";

/**
 * The 3D view, filling the window. One animation frame loop advances the
 * game and then draws it, so the picture is never a frame behind the
 * rules. The renderer plugs into the session for raycasts while mounted.
 */
export function ViewCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SurvivalRenderer(canvas, session);
    session.attachView(renderer);
    exposeForTests("__zsView", renderer);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    const loop = (now: number) => {
      session.tick(now);
      renderer.frame(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      session.attachView(null);
      renderer.dispose();
    };
  }, [session]);

  return <canvas ref={canvasRef} className="zs-stage__canvas" />;
}
