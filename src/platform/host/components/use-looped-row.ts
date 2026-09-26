"use client";
import { useEffect, useState, type RefObject } from "react";

/** The row is drawn three times over, so there is always a copy on either side. */
export const COPIES = 3;

/** How long a smooth scroll takes before the row quietly recentres. */
const SETTLE_MS = 420;

interface Place {
  /** The chosen tile among all the copies. */
  at: number;
  /** The game it stands for, to spot a new choice from outside. */
  game: number;
  /** True for the one render where the row jumps back to the middle copy. */
  jump: boolean;
}

/**
 * Keeps an endless looking row of tiles. The games are drawn three times
 * over and the choice lives in the middle copy. Moving past the last game
 * steps on to the first game of the next copy, so it really is just to the
 * right, then once the scroll settles the row jumps back to the matching
 * tile of the middle copy. Every copy looks the same, so the jump is
 * invisible. Returns the chosen tile and a picker for clicks on any copy.
 */
export function useLoopedRow(rowRef: RefObject<HTMLElement | null>, selected: number, count: number) {
  const [place, setPlace] = useState<Place>({ at: count + selected, game: selected, jump: false });

  // A new choice from the arrows: take the short way round, so the last game steps right onto the first.
  if (place.game !== selected) {
    let step = (selected - place.game + count) % count;
    if (step > count / 2) step -= count;
    setPlace({ at: place.at + step, game: selected, jump: false });
  }

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollTo({ left: settledLeft(row, place.at), behavior: place.jump ? "instant" : "smooth" });
    if (place.jump) {
      // Size transitions come back once the jump has been drawn.
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove("home__tiles--jump")));
      return () => cancelAnimationFrame(frame);
    }
    if (place.at >= count && place.at < count * 2) return;
    const timer = window.setTimeout(() => {
      // Paused first, so the tile that becomes chosen does not visibly grow.
      row.classList.add("home__tiles--jump");
      setPlace({ at: count + place.game, game: place.game, jump: true });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [rowRef, place, count]);

  const pick = (at: number) => setPlace({ at, game: at % count, jump: false });
  return { at: place.at, pick };
}

/**
 * Where the row should scroll so a tile sits at the front once the size
 * change has finished. Measuring the tile now would be wrong: the tile just
 * left is still shrinking, so everything after it would slide left after the
 * scroll and cut the chosen tile off. Every tile before it ends up small, so
 * the spot is simply that many small tiles and gaps in.
 */
function settledLeft(row: HTMLElement, index: number): number {
  const tiles = [...row.querySelectorAll<HTMLElement>(".game-tile")];
  const small = tiles.find((tile) => tile.getAttribute("aria-pressed") === "false" && tile.getAnimations().length === 0);
  const width = (small ?? tiles[0])?.getBoundingClientRect().width ?? 0;
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  return index * (width + gap);
}
