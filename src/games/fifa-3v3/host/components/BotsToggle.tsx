"use client";

/**
 * Computer players on or off. Off, the sides are just the people in the
 * room, so two friends can play one on one with the keepers in goal.
 */
export function BotsToggle({ on, onChange }: { on: boolean; onChange(on: boolean): void }) {
  return (
    <div className="fifa-bots" role="group" aria-label="Computer players">
      <span className="fifa-bots__label">Computer players</span>
      <div className="fifa-bots__segments">
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

/** The lobby's subtitle: the size of the match, with the real numbers once computers are off. */
export function matchSize(bots: boolean, home: number, away: number): string {
  if (bots) return "Three a side under the lights.";
  if (home === 0 || away === 0) return "Sides of any size under the lights.";
  return `${COUNT[home] ?? home} on ${(COUNT[away] ?? String(away)).toLowerCase()} under the lights.`;
}
