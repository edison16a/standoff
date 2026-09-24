"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { FencerPreview, type SwordAngles } from "@/games/fencing/render/preview";
import type { CharacterId } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";

interface FencerCanvasProps {
  characterId: CharacterId;
  slot: Slot;
  className?: string;
  /** Read every frame, so the sword can follow the phone live. */
  sword?: () => SwordAngles;
}

/** One fencer in guard, breathing, drawn with the same rig as the match. */
export function FencerCanvas({ characterId, slot, className, sword }: FencerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const swordRef = useRef(sword);
  useEffect(() => {
    swordRef.current = sword;
  });
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preview = new FencerPreview(canvas);
    let frame = 0;
    const draw = (now: number) => {
      preview.draw(characterId, slot, now, swordRef.current?.());
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [characterId, slot, theme]);

  return <canvas ref={canvasRef} className={className ?? "fencer-canvas"} aria-hidden="true" />;
}
