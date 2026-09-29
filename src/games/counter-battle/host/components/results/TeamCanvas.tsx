"use client";
import { useEffect, useRef } from "react";
import type { TeamId } from "../../../engine/fighter";
import { TeamScene, type TeamWinner } from "../../../render/victory/team-scene";

/** The winning team's scene, filling the results. Built once per result and freed when the results close. */
export default function TeamCanvas({ team, winners }: { team: TeamId; winners: readonly TeamWinner[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const key = `${team}:${winners.map((w) => `${w.character}/${w.gun}/${w.colour}`).join(",")}`;
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const scene = new TeamScene(el, team, winners);
    return () => scene.dispose();
    // Only the key matters: a new winners array with the same people must not rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div ref={holder} className="cb-results__scene" aria-hidden="true" />;
}
