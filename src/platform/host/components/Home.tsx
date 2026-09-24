"use client";
import { useEffect, useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GAMES } from "@/games/catalog";
import { useHostStore } from "../host-store";
import { GameBackdrop } from "./GameBackdrop";
import { GameDetails } from "./GameDetails";
import { GameTiles } from "./GameTiles";
import { useHostRoom } from "./host-context";

/**
 * The game chosen in this tab. Opening the app picks one at random, so
 * every game gets seen. Coming back from a room keeps the one you had.
 */
let lastChoice: number | null = null;

function firstChoice(): number {
  lastChoice ??= Math.floor(Math.random() * GAMES.length);
  return lastChoice;
}

/** Keys pressed on these belong to them, not to the game row. */
const OWNS_KEYS = "input, textarea, select, button, a, [contenteditable]";

/**
 * The home screen, laid out like a console menu: a row of game tiles at
 * the top, the chosen game's art filling the screen behind, and its name,
 * details and a Host Game button underneath.
 */
export function Home() {
  const host = useHostRoom();
  const { status, resuming, error } = useHostStore();
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState(firstChoice);
  // The catalog is never empty, and every index here comes from wrapping round it.
  const game = GAMES[selected] ?? GAMES[0]!;
  const replaced = status === "replaced";
  const canPlay = status === "open" && !resuming && !starting;

  const choose = (index: number) => {
    lastChoice = index;
    setSelected(index);
  };

  const play = async () => {
    if (!canPlay || game.status !== "ready") return;
    setStarting(true);
    await host.create(game.id, Math.max(...game.players));
    setStarting(false);
  };

  // Arrows and Enter work from anywhere on the page, like a controller, unless a control has focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest(OWNS_KEYS)) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const step = event.key === "ArrowRight" ? 1 : -1;
        choose((selected + step + GAMES.length) % GAMES.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        void play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const note = replaced
    ? "This game is open in another tab."
    : status === "unreachable"
      ? "Can't reach the game server."
      : error;

  return (
    <div className="home">
      <GameBackdrop game={game} />
      <header className="home__bar">
        <HomeLink />
        <div className="home__tools">
          <ThemeToggle />
          <GitHubButton />
        </div>
      </header>
      {note && (
        <div className="home__note" role="status">
          <span>{note}</span>
          {replaced && (
            <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
              <Icon name="refresh" />
              Use this tab
            </button>
          )}
        </div>
      )}
      <main className="home__main">
        <GameTiles games={GAMES} selected={selected} onSelect={choose} onHost={() => void play()} />
        <GameDetails game={game} canPlay={canPlay} starting={starting} onHost={() => void play()} />
      </main>
    </div>
  );
}
