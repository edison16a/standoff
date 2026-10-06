"use client";

/**
 * Computer players on or off. Off, the teams are just the people in the
 * room, so two friends can play one on one.
 */
export function BotsToggle({ on, onChange }: { on: boolean; onChange(on: boolean): void }) {
  return (
    <div className="nba-bots" role="group" aria-label="Computer players">
      <span className="nba-bots__label">Computer players</span>
      <div className="nba-bots__segments">
        <button type="button" aria-pressed={on} onClick={() => onChange(true)}>
          On
        </button>
        <button type="button" aria-pressed={!on} onClick={() => onChange(false)}>
          Off
        </button>
      </div>
    </div>
  );
}

const COUNT = ["Nobody", "One", "Two", "Three"];

/** The lobby's subtitle: the size of the game, with the real numbers once computers are off. */
export function matchSize(bots: boolean, size: number, home: number, away: number): string {
  if (bots) return `${COUNT[size] ?? size} on ${(COUNT[size] ?? String(size)).toLowerCase()}, first to 11.`;
  if (home === 0 || away === 0) return "Teams of any size, first to 11.";
  return `${COUNT[home] ?? home} on ${(COUNT[away] ?? String(away)).toLowerCase()}, first to 11.`;
}
