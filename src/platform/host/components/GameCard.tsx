"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { GameInfo } from "@/platform/games/game-api";

interface GameCardProps {
  game: GameInfo;
  /** The server is there and nothing else is opening a room. */
  canPlay: boolean;
  /** What the Play button says while it cannot be pressed. */
  waiting: string;
  onPlay(players: number): void;
}

const count = (players: number) => (players === 1 ? "1 player" : `${players} players`);

/**
 * One game on the home dashboard. The cover fills the card and a plain
 * strip under it holds the name, the pitch and how to start. Games still
 * being built show what they will offer, so nobody hunts for a button.
 */
export function GameCard({ game, canPlay, waiting, onPlay }: GameCardProps) {
  const ready = game.status === "ready";
  // Two players is the default wherever it is offered, since most games are head to head.
  const [players, setPlayers] = useState(game.players.includes(2) ? 2 : game.players[0]!);
  const Cover = game.Cover;

  return (
    <article className={`game-card ${ready ? "game-card--ready" : ""}`} style={{ "--game": game.color } as React.CSSProperties}>
      <div className="game-card__cover">
        <Cover />
        {!ready && (
          <span className="game-card__badge">
            <span className="game-card__dot" />
            In development
          </span>
        )}
      </div>
      <div className="game-card__body">
        <div className="game-card__text">
          <h2 className="game-card__title">{game.title}</h2>
          <p className="game-card__tagline">{game.tagline}</p>
        </div>
        {ready ? (
          <div className="game-card__actions">
            {game.players.length > 1 ? (
              <div className="segmented" role="group" aria-label={`Players for ${game.title}`}>
                {game.players.map((option) => (
                  <button key={option} type="button" aria-pressed={option === players} onClick={() => setPlayers(option)}>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <span className="game-card__players">
                <Icon name="users" size={18} />
                {count(players)}
              </span>
            )}
            <button type="button" className="btn btn--primary game-card__play" onClick={() => onPlay(players)} disabled={!canPlay}>
              <Icon name="play" />
              {canPlay ? "Play" : waiting}
            </button>
          </div>
        ) : (
          <span className="game-card__players">
            <Icon name="users" size={18} />
            Up to {count(Math.max(...game.players))}
          </span>
        )}
      </div>
    </article>
  );
}
