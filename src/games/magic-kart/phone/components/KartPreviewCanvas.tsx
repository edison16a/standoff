"use client";
import { useEffect, useRef } from "react";
import type { CharacterId } from "../../characters";
import { KartPreview } from "../../render/preview";

/** The 3D kart, turning on its stand. */
export default function KartPreviewCanvas({ character }: { character: CharacterId }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<KartPreview | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const preview = new KartPreview(holder);
    previewRef.current = preview;
    return () => {
      preview.dispose();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    previewRef.current?.show(character);
  }, [character]);

  return <div ref={holderRef} className="mk-pick__holder" />;
}
