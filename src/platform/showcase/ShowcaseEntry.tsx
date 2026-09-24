"use client";
import { useEffect, useState, type ComponentType } from "react";
import { findGame, loadGame } from "@/games/catalog";
import type { ShowcaseView } from "@/platform/games/game-api";

type Scene = ComponentType<{ view: ShowcaseView }>;

declare global {
  interface Window {
    /** Set once the showcase scene is mounted, so the capture tool knows when to start. */
    __showcaseReady?: boolean;
  }
}

/**
 * Mounts a game's Showcase full screen with nothing around it. A game
 * without one shows its drawn Cover, so every game can be captured.
 */
export function ShowcaseEntry({ gameId, view }: { gameId: string; view: ShowcaseView }) {
  const [Scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    let alive = true;
    const Cover = findGame(gameId)?.Cover;
    // The drawn cover takes no view, so it is wrapped to fit the same shape.
    const fallback: Scene | undefined = Cover && (() => <Cover />);
    const loading = loadGame(gameId);
    const settle = (next: Scene | undefined) => {
      if (!alive || !next) return;
      setScene(() => next);
    };
    if (!loading) settle(fallback);
    else void loading.then((mod) => settle(mod.Showcase ?? fallback));
    return () => {
      alive = false;
    };
  }, [gameId]);

  useEffect(() => {
    if (!Scene) return;
    const frame = requestAnimationFrame(() => (window.__showcaseReady = true));
    return () => cancelAnimationFrame(frame);
  }, [Scene]);

  return <div className="showcase">{Scene && <Scene view={view} />}</div>;
}
