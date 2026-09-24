"use client";
import { Icon } from "@/components/ui/Icon";
import type { GameInfo } from "@/platform/games/game-api";

interface GameDetailsProps {
  game: GameInfo;
  /** The server is there and nothing else is opening a room. */
  canPlay: boolean;
  /** A room is being opened right now. */
  starting: boolean;
  onHost(): void;
}

const count = (players: number) => (players === 1 ? "1 player" : `${players} players`);

/** "2 players" when a game takes one number, "Up to 4 players" when it takes a range. */
function playersLabel(game: GameInfo): string {
  const most = Math.max(...game.players);
  return game.players.length > 1 ? `Up to ${count(most)}` : count(most);
}

/**
 * The chosen game, told in full under the row of tiles: its name, what
 * it is, who can play, and the button that opens a room for it.
 */
export function GameDetails({ game, canPlay, starting, onHost }: GameDetailsProps) {
  const ready = game.status === "ready";
  const label = !ready ? "Coming soon" : starting ? "Opening room" : canPlay ? "Host Game" : "Connecting";

  return (
    <section key={game.id} className="home__details" style={{ "--game": game.color } as React.CSSProperties}>
      <h1 className="home__title">{game.title}</h1>
      <p className="home__tagline">{game.tagline}</p>
      <p className="home__meta">
        <span className="home__meta-item">
          <Icon name="users" size={18} />
          {playersLabel(game)}
        </span>
        {game.input === "camera" && (
          <span className="home__meta-item">
            <Icon name="camera" size={18} />
            Uses your camera
          </span>
        )}
        {!ready && <span className="home__badge">In development</span>}
      </p>
      <div className="home__actions">
        <button type="button" className="btn btn--lg home__host" onClick={onHost} disabled={!ready || !canPlay}>
          <Icon name="play" />
          {label}
        </button>
      </div>
    </section>
  );
}
