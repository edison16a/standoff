"use client";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import type { GameInfo } from "@/platform/games/game-api";

interface GameCarouselProps {
  games: readonly GameInfo[];
  selected: number;
  onSelect(index: number): void;
  /** Enter on the selected card. */
  onPlay(): void;
}

/** A swipe this long, in pixels, moves one card. */
const SWIPE_PX = 40;

/**
 * The games in a row, the selected one big in the middle and its
 * neighbours smaller at the sides, like a console's home screen. Arrow
 * keys, the side buttons, a click on a neighbour, a swipe or a sideways
 * scroll all move along it.
 */
export function GameCarousel({ games, selected, onSelect, onPlay }: GameCarouselProps) {
  const swipeFrom = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const step = (by: number) => onSelect(Math.min(games.length - 1, Math.max(0, selected + by)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") onSelect(Math.max(0, selected - 1));
      if (event.key === "ArrowRight") onSelect(Math.min(games.length - 1, selected + 1));
      if (event.key === "Enter") onPlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [games.length, selected, onSelect, onPlay]);

  const onWheel = (event: React.WheelEvent) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    // A trackpad fires dozens of wheel events per flick. One card per flick.
    if (Math.abs(delta) < 20 || event.timeStamp - lastWheel.current < 350) return;
    lastWheel.current = event.timeStamp;
    step(delta > 0 ? 1 : -1);
  };

  return (
    <div
      className="carousel"
      onWheel={onWheel}
      onPointerDown={(event) => (swipeFrom.current = event.clientX)}
      onPointerUp={(event) => {
        const from = swipeFrom.current;
        swipeFrom.current = null;
        if (from !== null && Math.abs(event.clientX - from) > SWIPE_PX) step(event.clientX < from ? 1 : -1);
      }}
    >
      <div className="carousel__track" role="listbox" aria-label="Games">
        {games.map((game, index) => {
          const offset = index - selected;
          const Cover = game.Cover;
          return (
            <button
              key={game.id}
              type="button"
              role="option"
              aria-selected={offset === 0}
              className={`carousel__card ${offset === 0 ? "carousel__card--selected" : ""}`}
              style={{ "--offset": offset } as React.CSSProperties}
              tabIndex={offset === 0 ? 0 : -1}
              onClick={() => (offset === 0 ? onPlay() : onSelect(index))}
            >
              <span className="carousel__cover">{Math.abs(offset) <= 2 && <Cover />}</span>
              <span className="carousel__name">{game.title}</span>
              {game.status === "development" && <span className="carousel__badge">In development</span>}
            </button>
          );
        })}
      </div>
      <button type="button" className="carousel__arrow carousel__arrow--left" onClick={() => step(-1)} disabled={selected === 0} aria-label="Previous game">
        <Icon name="chevronLeft" />
      </button>
      <button
        type="button"
        className="carousel__arrow carousel__arrow--right"
        onClick={() => step(1)}
        disabled={selected === games.length - 1}
        aria-label="Next game"
      >
        <Icon name="chevronRight" />
      </button>
    </div>
  );
}
