"use client";
import { useEffect, useRef } from "react";
import type { CharacterId } from "../../../roster";
import { PedestalScene } from "./pedestal-scene";

/** The winner's pedestal scene, filling the results. Built once per winner and freed when the results close. */
export default function PedestalCanvas({ character, colours }: { character: CharacterId; colours: readonly string[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const key = `${character}:${colours.join(",")}`;
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const scene = new PedestalScene(el, character, colours);
    return () => scene.dispose();
    // Only the key matters: a new colours array with the same colours must not rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div ref={holder} className="bb-pedestal" aria-hidden="true" />;
}
