"use client";
import { useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GAMES } from "@/games/catalog";
import { useHostStore } from "../host-store";
import { useHostRoom } from "./host-context";
import { GameCarousel } from "./GameCarousel";

/**
 * The home screen: every game on one shelf. Pick one, pick how many are
 * playing where the game offers a choice, and Play opens a room for it.
 */
export function Home() {
  const host = useHostRoom();
  const { status, resuming, error, selected } = useHostStore();
  const index = Math.max(0, GAMES.findIndex((game) => game.id === selected));
  const game = GAMES[index]!;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const players = counts[game.id] ?? game.players[game.players.length > 1 ? 1 : 0]!;
  const [starting, setStarting] = useState(false);
  const replaced = status === "replaced";
  const ready = status === "open" && !resuming && !starting;

  const play = async () => {
    if (game.status !== "ready" || !ready) return;
    setStarting(true);
    await host.create(game.id, players);
    setStarting(false);
  };

  return (
    <div className="home">
      <header className="home__bar">
        <HomeLink />
        <div className="home__tools">
          <ThemeToggle />
          <GitHubButton />
        </div>
      </header>
      <GameCarousel games={GAMES} selected={index} onSelect={(i) => useHostStore.setState({ selected: GAMES[i]!.id })} onPlay={play} />
      <section className="home__detail" aria-live="polite">
        <h1 className="home__title">{game.title}</h1>
        <p className="home__tagline">{game.tagline}</p>
        {game.players.length > 1 ? (
          <div className="segmented" role="group" aria-label="Players">
            {game.players.map((count) => (
              <button key={count} type="button" aria-pressed={count === players} onClick={() => setCounts({ ...counts, [game.id]: count })}>
                {count === 1 ? "1 player" : `${count} players`}
              </button>
            ))}
          </div>
        ) : (
          <span className="home__players">{players === 1 ? "1 player" : `${players} players`}</span>
        )}
        {replaced ? (
          <button type="button" className="btn btn--primary btn--lg" onClick={() => location.reload()}>
            <Icon name="refresh" />
            Use this tab
          </button>
        ) : game.status === "ready" ? (
          <button type="button" className="btn btn--primary btn--lg home__play" onClick={play} disabled={!ready}>
            <Icon name="play" />
            {ready || starting ? "Play" : "Connecting"}
          </button>
        ) : (
          <span className="pill">In development</span>
        )}
        {replaced && <p className="home__note">This game is open in another tab.</p>}
        {status === "unreachable" && <p className="home__note">Can&apos;t reach the game server.</p>}
        {error && <p className="home__note">{error}</p>}
      </section>
    </div>
  );
}
