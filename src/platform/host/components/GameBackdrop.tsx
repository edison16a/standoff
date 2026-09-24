"use client";
import { useEffect, useState } from "react";
import type { GameInfo } from "@/platform/games/game-api";

/** How long the new picture takes to fade in over the old one. Matches home.css. */
const FADE_MS = 450;

/**
 * The chosen game's art filling the whole screen, under a scrim so the
 * words on top read. When the choice changes the new art fades in over
 * the old, and the old one is unmounted once it is covered, so at most
 * two big covers run at once, and only for the length of the fade.
 */
export function GameBackdrop({ game }: { game: GameInfo }) {
  const [current, setCurrent] = useState(game);
  const [previous, setPrevious] = useState<GameInfo | null>(null);

  // Swapping during render, not in an effect, so the old art never blinks out for a frame.
  if (game !== current) {
    setPrevious(current);
    setCurrent(game);
  }

  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => setPrevious(null), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [previous]);

  const Current = current.Cover;
  const Previous = previous?.Cover;

  return (
    <div className="home__backdrop" aria-hidden="true">
      {Previous && (
        <div key={previous.id} className="home__backdrop-art">
          <Previous />
        </div>
      )}
      <div key={current.id} className={previous ? "home__backdrop-art home__backdrop-art--in" : "home__backdrop-art"}>
        <Current />
      </div>
      <div className="home__scrim" />
    </div>
  );
}
