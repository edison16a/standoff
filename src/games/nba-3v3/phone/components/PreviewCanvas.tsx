"use client";
import { useEffect, useRef } from "react";
import type { TeamId } from "../../engine/types";
import { AthletePreview } from "../../render/preview";
import type { BuildId } from "../../builds";

/** The chosen build in 3D, dribbling on a turning stand, with the player's own name on the back. */
export default function PreviewCanvas({ build, team, name = "" }: { build: BuildId; team: TeamId | null; name?: string }) {
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
    previewRef.current?.show(build, team, name);
  }, [build, team, name]);

  return <div ref={holderRef} className="nba-preview" />;
}
