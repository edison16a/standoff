"use client";
import { useEffect, useRef } from "react";
import { FinishScene } from "../../../render/victory/finish-scene";
import type { Stand } from "../../../render/victory/finish-stage";

/** The finish celebration, filling the results. Built once per round and freed when the results close. */
export default function FinishCanvas({ stand, levelId }: { stand: Stand; levelId: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const key = `${levelId}:${JSON.stringify(stand)}`;
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const scene = new FinishScene(el, stand, levelId);
    return () => scene.dispose();
    // Only the key matters: a new stand object with the same places must not rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div ref={holder} className="cg-results__scene" aria-hidden="true" />;
}
