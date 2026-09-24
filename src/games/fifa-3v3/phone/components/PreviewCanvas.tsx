"use client";
import { useEffect, useRef } from "react";
import { StarPreview } from "../../render/preview";
import type { CharacterId } from "../../roster";

/** The chosen star in 3D, turning on a podium. */
export default function PreviewCanvas({ character }: { character: CharacterId }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<StarPreview | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const preview = new StarPreview(holder);
    previewRef.current = preview;
    return () => {
      preview.dispose();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    previewRef.current?.show(character);
  }, [character]);

  return <div ref={holderRef} className="fifa-preview" />;
}
