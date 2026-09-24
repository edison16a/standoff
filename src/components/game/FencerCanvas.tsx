"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { FencerPreview } from "@/render/preview";
import type { CharacterId } from "@/shared/characters";
import type { Slot } from "@/shared/players";

interface FencerCanvasProps {
  characterId: CharacterId;
  slot: Slot;
  className?: string;
}

/** One fencer in guard, breathing, drawn with the same rig as the match. */
export function FencerCanvas({ characterId, slot, className }: FencerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preview = new FencerPreview(canvas);
    let frame = 0;
    const draw = (now: number) => {
      preview.draw(characterId, slot, now);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [characterId, slot, theme]);

  return <canvas ref={canvasRef} className={className ?? "fencer-canvas"} aria-hidden="true" />;
}
