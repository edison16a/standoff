"use client";
import { useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GAMES } from "@/games/catalog";
import { useHostStore } from "../host-store";
import { useHostRoom } from "./host-context";
import { GameCard } from "./GameCard";

/**
 * The home screen: every game as a big card, two to a row, so the whole
 * line up is visible at once. Play on a card opens a room for that game.
 */
export function Home() {
  const host = useHostRoom();
  const { status, resuming, error } = useHostStore();
  const [starting, setStarting] = useState(false);
  const replaced = status === "replaced";
  const canPlay = status === "open" && !resuming && !starting;

  const play = async (game: string, players: number) => {
    if (!canPlay) return;
    setStarting(true);
    await host.create(game, players);
    setStarting(false);
  };

  const note = replaced
    ? "This game is open in another tab."
    : status === "unreachable"
      ? "Can't reach the game server."
      : error;

  return (
    <div className="home">
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
      <main className="home__grid">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} canPlay={canPlay} waiting={starting ? "Opening" : "Connecting"} onPlay={(players) => play(game.id, players)} />
        ))}
      </main>
    </div>
  );
}
