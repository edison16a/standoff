"use client";
import { useEffect, useRef } from "react";
import type { FencerFrame, SceneFrame } from "@/games/fencing/engine/frames";
import { SceneRenderer } from "@/games/fencing/render/scene-renderer";
import { useTheme } from "@/hooks/use-theme";

/** The two fencers are squared up close, so the picture frames tighter than a match. */
const PREVIEW_SPAN = 5.2;

function standing(slot: 1 | 2, characterId: FencerFrame["characterId"], x: number, pitch: number): FencerFrame {
  return {
    slot, characterId, x, facing: slot === 1 ? 1 : -1, pitch, yaw: 0, roll: 0, speed: 0,
    action: "idle", actionMs: 0, parrying: false,
  };
}

/**
 * Fencing's card on the home screen: two fencers squared up on the strip,
 * drawn live by the real renderer, blades searching for an opening.
 */
export function Cover() {
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
      const scene: SceneFrame = {
        t: now,
        fencers: [standing(1, "vale", -1.35, Math.sin(now / 700) * 0.18), standing(2, "marrow", 1.35, Math.sin(now / 900 + 1) * 0.18)],
      };
      renderer.render(scene);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="cover__canvas" aria-hidden="true" />;
}
