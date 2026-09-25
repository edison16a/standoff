"use client";
import { useEffect, useRef } from "react";
import { GameRenderer } from "../../render/game-renderer";
import { useSession } from "./session-context";

/**
 * The 3D view, always on: the computer's run behind the menus, then the
 * players' own runs. Each animation frame asks the session what to draw.
 */
export default function GameCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new GameRenderer(canvas);
    // Browser tests on a slow machine draw at a fraction of the resolution. Development builds only.
    const hook = (window as { __cubeGameRenderScale?: number }).__cubeGameRenderScale;
    const scale = process.env.NODE_ENV === "development" && hook ? hook : 1;
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, Math.min(2, window.devicePixelRatio || 1) * scale);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    const loop = (now: number) => {
      const input = session.frame(now);
      renderer.setLevel(session.level);
      renderer.draw(input);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [session]);

  return <canvas ref={canvasRef} className="cg-canvas" />;
}
