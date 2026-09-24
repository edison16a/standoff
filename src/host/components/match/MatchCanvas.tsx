"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { SceneRenderer } from "@/render/scene-renderer";
import { useSession } from "../session-context";

/**
 * The strip itself. One animation frame loop advances the engine and
 * draws whatever scene it hands back, live or replay. Everything else on
 * the match screen is ordinary React laid over the top.
 */
export function MatchCanvas() {
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
      // A rematch or a new match swaps the driver, so rewire the flash.
      if (session.driver !== driver) {
        unlisten?.();
        driver = session.driver;
        unlisten = driver?.listen((event) => renderer.react(event)) ?? null;
      }
      if (driver) renderer.render(driver.engine.scene());
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

  return <canvas ref={canvasRef} className="match__canvas" />;
}
