"use client";
import Image from "next/image";
import { useRef } from "react";
import type { GameInfo } from "@/platform/games/game-api";
import { COPIES, useTileRail } from "./use-tile-rail";

interface GameTilesProps {
  games: readonly GameInfo[];
  selected: number;
  /** `via` says whether it came from the arrows or a click, for the menu sounds. */
  onSelect(index: number, via: "key" | "click"): void;
  /** Clicking the tile that is already chosen starts that game. */
  onHost(): void;
}

/**
 * The row of games along the top: only their art, no words. It loops like
 * a console menu: after the last game the first one is simply next on the
 * right. The row stays still while the choice moves within view, and slides
 * to put the chosen game in the middle once a move passes an edge.
 */
export function GameTiles({ games, selected, onSelect, onHost }: GameTilesProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = games.length;
  const { at, pick } = useTileRail(rowRef, trackRef, selected, count);

  // Arrow keys on a focused tile move focus with the choice, so keyboard users stay on the row.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    onSelect((selected + step + count) % count, "key");
    requestAnimationFrame(() =>
      rowRef.current?.querySelector<HTMLButtonElement>('.game-tile[aria-pressed="true"]')?.focus({ preventScroll: true }),
    );
  };

  const slots = Array.from({ length: count * COPIES }, (_, slot) => slot);
  const real = Math.floor(COPIES / 2);
  return (
    <div ref={rowRef} className="home__tiles" role="group" aria-label="Games" onKeyDown={onKeyDown}>
      {/* Hidden probes give the settled tile sizes, whatever the tiles are animating. */}
      <span className="home__probe home__probe--off" aria-hidden="true" />
      <span className="home__probe home__probe--on" aria-hidden="true" />
      <div ref={trackRef} className="home__track">
        {slots.map((slot) => {
          const index = slot % count;
          const game = games[index]!;
          const chosen = slot === at;
          // Only the middle copy is real to screen readers and tests; the others are look alikes for the loop.
          const copy = Math.floor(slot / count) !== real;
          const Cover = game.Cover;
          return (
            <button
              key={slot}
              type="button"
              className="game-tile"
              data-tile={copy ? undefined : game.id}
              style={{ "--game": game.color } as React.CSSProperties}
              aria-label={game.title}
              aria-hidden={copy && !chosen ? true : undefined}
              aria-pressed={chosen}
              tabIndex={chosen ? 0 : -1}
              onClick={() => {
                if (chosen) return onHost();
                pick(slot);
                onSelect(index, "click");
              }}
            >
              <span className="game-tile__art">
                {game.media ? <Image className="cover__art" src={game.media.icon} alt="" fill sizes="180px" /> : <Cover />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
