"use client";
import { useEffect, useRef } from "react";
import type { CharacterId } from "../../characters";
import { KartPreview } from "../../render/preview";

/** The 3D kart, turning on its stand. */
export default function KartPreviewCanvas({ character }: { character: CharacterId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<KartPreview | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preview = new KartPreview(canvas);
    previewRef.current = preview;
    return () => {
      preview.dispose();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    previewRef.current?.show(character);
  }, [character]);

  return <canvas ref={canvasRef} className="mk-pick__canvas" />;
}
