"use client";
import { useEffect, useRef } from "react";
import { StarPreview } from "../../render/preview";
import type { CharacterId } from "../../roster";
import type { TeamId } from "../../teams";

/** The chosen star in 3D, turning on a podium in their side's uniform. */
export default function PreviewCanvas({ character, team }: { character: CharacterId; team: TeamId }) {
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
    previewRef.current?.show(character, team);
  }, [character, team]);

  return <div ref={holderRef} className="fb-preview" />;
}
