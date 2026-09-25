"use client";
import { useEffect, useRef } from "react";
import type { TeamId } from "../../engine/types";
import { AthletePreview } from "../../render/preview";
import type { CharacterId } from "../../roster";

/** The chosen star in 3D, dribbling on a turning stand. */
export default function PreviewCanvas({ character, team }: { character: CharacterId; team: TeamId | null }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<AthletePreview | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const preview = new AthletePreview(holder);
    previewRef.current = preview;
    return () => {
      preview.dispose();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    previewRef.current?.show(character, team);
  }, [character, team]);

  return <div ref={holderRef} className="nba-preview" />;
}
