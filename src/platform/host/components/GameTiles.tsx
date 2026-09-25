"use client";
import Image from "next/image";
import { useMemo, useRef } from "react";
import type { GameInfo } from "@/platform/games/game-api";
import { useCarouselMotion } from "./use-carousel-motion";

interface GameTilesProps {
  games: readonly GameInfo[];
  selected: number;
  /** `via` says whether it came from the arrows or a click, for the menu sounds. */
  onSelect(index: number, via: "key" | "click"): void;
  /** Clicking the tile that is already chosen starts that game. */
  onHost(): void;
}

/**
 * The row of games along the top: only their art, no words. It turns like
 * a carousel: the chosen game always sits first, and the ones after it
 * follow in order, wrapping round to the start. The chosen one grows and
 * gets a ring in its own colour.
 */
export function GameTiles({ games, selected, onSelect, onHost }: GameTilesProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const order = useMemo(() => games.map((_, i) => (selected + i) % games.length), [games, selected]);
  const ids = useMemo(() => order.map((index) => games[index]!.id), [games, order]);
  useCarouselMotion(rowRef, ids);

  // Arrow keys on a focused tile move focus with the choice, so keyboard users stay on the row.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (selected + step + games.length) % games.length;
    onSelect(next, "key");
    // The chosen tile is always first, so focus follows it there.
    requestAnimationFrame(() => rowRef.current?.querySelector<HTMLButtonElement>(".game-tile")?.focus());
  };

  return (
    <div ref={rowRef} className="home__tiles" role="group" aria-label="Games" onKeyDown={onKeyDown}>
      {order.map((index) => {
        const game = games[index]!;
        const chosen = index === selected;
        const Cover = game.Cover;
        return (
          <button
            key={game.id}
            type="button"
            className="game-tile"
            data-tile={game.id}
            style={{ "--game": game.color } as React.CSSProperties}
            aria-label={game.title}
            aria-pressed={chosen}
            tabIndex={chosen ? 0 : -1}
            onClick={() => (chosen ? onHost() : onSelect(index, "click"))}
          >
            <span className="game-tile__art">
              {game.media ? <Image className="cover__art" src={game.media.icon} alt="" fill sizes="220px" /> : <Cover />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
