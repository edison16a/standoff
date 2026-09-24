"use client";
import { Icon } from "@/components/ui/Icon";
import type { GameInfo } from "@/platform/games/game-api";

interface GameCardProps {
  game: GameInfo;
  /** The server is there and nothing else is opening a room. */
  canPlay: boolean;
  onPlay(players: number): void;
}

const count = (players: number) => (players === 1 ? "1 player" : `${players} players`);

/**
 * One game on the home dashboard. The whole card is the button: a click
 * opens a room with a seat for as many players as the game takes, and
 * whoever scans in plays. Games still being built are shown but do nothing.
 */
export function GameCard({ game, canPlay, onPlay }: GameCardProps) {
  const ready = game.status === "ready";
  const most = Math.max(...game.players);
  const Cover = game.Cover;

  return (
    <button
      type="button"
      className="game-card"
      style={{ "--game": game.color } as React.CSSProperties}
      onClick={() => onPlay(most)}
      disabled={!ready || !canPlay}
      aria-label={ready ? `Play ${game.title}` : `${game.title}, coming later`}
    >
      <span className="game-card__cover">
        <Cover />
      </span>
      <span className="game-card__body">
        <span className="game-card__head">
          <span className="game-card__title">{game.title}</span>
          <span className="game-card__players">
            <Icon name="users" size={18} />
            {game.players.length > 1 ? `Up to ${count(most)}` : count(most)}
          </span>
        </span>
        <span className="game-card__tagline">{game.tagline}</span>
      </span>
    </button>
  );
}
