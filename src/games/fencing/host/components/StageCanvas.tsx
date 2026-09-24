"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { SceneRenderer } from "@/games/fencing/render/scene-renderer";
import { useSession } from "../../../../platform/host/components/session-context";

/**
 * The strip, filling the window from the moment a game exists. One
 * animation frame loop advances the match (when there is one) and draws
 * whatever the session hands back: the lobby line up, live play or a
 * replay. Everything else on the stage is ordinary React laid over it.
 */
export function StageCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SceneRenderer(canvas);
    rendererRef.current = renderer;
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let driver = session.driver;
    let unlisten = driver?.listen((event) => renderer.react(event)) ?? null;
    let frame = 0;
    const loop = (now: number) => {
      session.tick(now);
      // A match starting, or a rematch, swaps the driver. Rewire the flash.
      if (session.driver !== driver) {
        unlisten?.();
        driver = session.driver;
        unlisten = driver?.listen((event) => renderer.react(event)) ?? null;
      }
      renderer.render(session.scene(now));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unlisten?.();
    };
  }, [session]);

  useEffect(() => {
    rendererRef.current?.refreshPalette();
  }, [theme]);

  return <canvas ref={canvasRef} className="stage__canvas" />;
}
