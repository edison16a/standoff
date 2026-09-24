"use client";
import { useEffect, useRef } from "react";
import type { FencerFrame, SceneFrame } from "@/game/frames";
import { SceneRenderer } from "@/render/scene-renderer";
import { useTheme } from "@/hooks/use-theme";

/** The two fencers are squared up close, so the picture frames tighter than a match. */
const PREVIEW_SPAN = 5.2;

function standing(slot: 1 | 2, characterId: FencerFrame["characterId"], x: number): FencerFrame {
  return {
    slot, characterId, x, facing: slot === 1 ? 1 : -1, pitch: 0.05, yaw: 0, roll: 0, speed: 0,
    action: "idle", actionMs: 0, parrying: false,
  };
}

/**
 * Two fencers squared up on the strip, drawn by the real renderer, filling
 * the landing page behind the title.
 */
export function StripPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SceneRenderer(canvas, PREVIEW_SPAN);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    const draw = (now: number) => {
      const scene: SceneFrame = { t: now, fencers: [standing(1, "vale", -1.35), standing(2, "marrow", 1.35)] };
      renderer.render(scene);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="stage__canvas" aria-hidden="true" />;
}
