"use client";
import { useRef } from "react";
import type { GameInfo } from "@/platform/games/game-api";

interface GameTilesProps {
  games: readonly GameInfo[];
  selected: number;
  onSelect(index: number): void;
  /** Clicking the tile that is already chosen starts that game. */
  onHost(): void;
}

/**
 * The row of games along the top: only their art, no words. The chosen
 * one grows and gets a ring in its own colour. Its neighbours move along
 * to make room, so tiles never overlap.
 */
export function GameTiles({ games, selected, onSelect, onHost }: GameTilesProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Arrow keys on a focused tile move focus with the choice, so keyboard users stay on the row.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (selected + step + games.length) % games.length;
    onSelect(next);
    rowRef.current?.querySelectorAll<HTMLButtonElement>(".game-tile")[next]?.focus();
  };

  return (
    <div ref={rowRef} className="home__tiles" role="group" aria-label="Games" onKeyDown={onKeyDown}>
      {games.map((game, index) => {
        const chosen = index === selected;
        const Cover = game.Cover;
        return (
          <button
            key={game.id}
            type="button"
            className="game-tile"
            style={{ "--game": game.color } as React.CSSProperties}
            aria-label={game.title}
            aria-pressed={chosen}
            tabIndex={chosen ? 0 : -1}
            onClick={() => (chosen ? onHost() : onSelect(index))}
          >
            <span className="game-tile__art">
              <Cover />
            </span>
          </button>
        );
      })}
    </div>
  );
}
