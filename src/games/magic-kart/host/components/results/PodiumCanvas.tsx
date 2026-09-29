"use client";
import { useEffect, useRef } from "react";
import { PodiumScene, type PodiumPlace } from "./podium-scene";

/**
 * The podium in 3D, filling the results. The scene is built once per
 * set of places and freed when the results close. A key made of the
 * places keeps it from rebuilding on every store update.
 */
export default function PodiumCanvas({ places }: { places: readonly PodiumPlace[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const key = places.map((p) => `${p.place}${p.character}`).join(",");
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const scene = new PodiumScene(el, places);
    return () => scene.dispose();
    // The places only matter by their key; a new array with the same karts must not rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div ref={holder} className="mk-podium" aria-hidden="true" />;
}
