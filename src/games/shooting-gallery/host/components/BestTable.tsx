"use client";
import type { BestEntry } from "../../engine/high-scores";

interface BestTableProps {
  entries: readonly BestEntry[];
  seconds: number;
  /** Places set this round, from 1, to light them up. */
  fresh?: readonly number[];
}

/** The best scores ever shot on this computer for one round length. */
export function BestTable({ entries, seconds, fresh = [] }: BestTableProps) {
  return (
    <section className="sg-best" aria-label={`Best scores, ${seconds} second rounds`}>
      <h3 className="sg-best__title">Best of {seconds}s rounds</h3>
      {entries.length === 0 ? (
        <p className="sg-best__empty">No scores yet. Be the first on the board.</p>
      ) : (
        <ol className="sg-best__list">
          {entries.map((entry, i) => (
            <li key={`${entry.at}-${entry.name}-${i}`} className={`sg-best__row ${fresh.includes(i + 1) ? "sg-best__row--fresh" : ""}`}>
              <span className="sg-best__place">{i + 1}</span>
              <span className="sg-best__name">{entry.name}</span>
              <span className="sg-best__acc">{Math.round(entry.accuracy * 100)}%</span>
              <span className="sg-best__score">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
