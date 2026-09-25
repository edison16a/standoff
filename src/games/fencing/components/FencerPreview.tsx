"use client";
import { useEffect, useRef } from "react";
import type { CharacterId } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";
import { FencerStand, type PreviewAction, type StandFraming, type SwordAngles } from "@/games/fencing/render/preview/fencer-stand";
import { previewHub } from "@/games/fencing/render/preview/preview-hub";

interface FencerPreviewProps {
  characterId: CharacterId;
  slot: Slot;
  className?: string;
  framing?: StandFraming;
  /** Read every frame, so the sword can follow the phone live. */
  sword?: () => SwordAngles | null;
  /** Read every frame: a lunge or parry to play, for the practice step. */
  action?: () => PreviewAction | null;
}

/** One 3D fencer on a stand, the very model the big screen uses, turning its sword with the phone. */
export function FencerPreview({ characterId, slot, className, framing = "card", sword, action }: FencerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const standRef = useRef<FencerStand | null>(null);
  const swordRef = useRef(sword);
  const actionRef = useRef(action);
  useEffect(() => {
    swordRef.current = sword;
    actionRef.current = action;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stand = new FencerStand(canvas, characterId, slot, framing);
    stand.sword = () => swordRef.current?.() ?? null;
    stand.action = () => actionRef.current?.() ?? null;
    standRef.current = stand;
    previewHub.add(stand);
    return () => {
      previewHub.remove(stand);
      stand.dispose();
      standRef.current = null;
    };
    // The character changes in place below, without a new stand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, framing]);

  useEffect(() => {
    standRef.current?.setCharacter(characterId);
  }, [characterId]);

  return <canvas ref={canvasRef} className={className ?? "fencer-preview"} aria-hidden="true" />;
}
