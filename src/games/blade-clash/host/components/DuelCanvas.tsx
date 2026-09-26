"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { DuelRenderer } from "@/games/blade-clash/render/duel-renderer";
import { useSession } from "./session-context";

/**
 * The split screen, filling the window from the moment a game exists. One
 * animation frame loop advances the match (when there is one) and draws
 * whatever the session hands back: the lobby line up or live play.
 * Everything else on the stage is ordinary React laid over it.
 */
export function DuelCanvas() {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DuelRenderer | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The theme effect below runs right after this one and sets the hall's look.
    const renderer = new DuelRenderer(canvas);
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
      // A match starting swaps the driver. Rewire the effects and cameras.
      if (session.driver !== driver) {
        unlisten?.();
        driver = session.driver;
        renderer.reset();
        unlisten = driver?.listen((event) => renderer.react(event)) ?? null;
      }
      renderer.render(session.scene(now), now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unlisten?.();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    rendererRef.current?.setTheme(theme === "dark");
  }, [theme]);

  return <canvas ref={canvasRef} className="stage__canvas" />;
}
