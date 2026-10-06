"use client";
import { TEAM_SIZES, type TeamSize } from "../lobby";

/** The game size in the lobby: one on one, two on two or three on three. Computers fill the gaps as before. */
export function SizePicker({ size, onChange }: { size: TeamSize; onChange(size: TeamSize): void }) {
  return (
    <div className="nba-bots" role="group" aria-label="Game size">
      <span className="nba-bots__label">Game size</span>
      <div className="nba-bots__segments">
        {TEAM_SIZES.map((n) => (
          <button key={n} type="button" aria-pressed={size === n} onClick={() => onChange(n)}>
            {n}v{n}
          </button>
        ))}
      </div>
    </div>
  );
}
