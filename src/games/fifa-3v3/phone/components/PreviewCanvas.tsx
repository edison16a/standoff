"use client";
import { useEffect, useRef } from "react";
import { BuildPreview } from "../../render/preview";
import type { BuildId } from "../../builds";

/** The chosen build in 3D, turning on a podium, with the player's name on the shirt. */
export default function PreviewCanvas({ build, name }: { build: BuildId; name: string }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<BuildPreview | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const preview = new BuildPreview(holder);
    previewRef.current = preview;
    return () => {
      preview.dispose();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    previewRef.current?.show(build, name);
  }, [build, name]);

  return <div ref={holderRef} className="fifa-preview" />;
}
