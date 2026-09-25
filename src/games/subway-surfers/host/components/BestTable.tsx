"use client";
import type { BestEntry } from "../../engine/best-scores";

/** The best runs on this computer, with the new ones from this round lit up. */
export function BestTable({ entries, fresh = [] }: { entries: readonly BestEntry[]; fresh?: readonly number[] }) {
  return (
    <section className="ss-best" aria-label="Best scores on this computer">
      <h3 className="ss-best__title">Best runs</h3>
      <ol className="ss-best__list">
        {entries.map((entry, i) => (
          <li key={`${entry.name}-${entry.at}-${i}`} className={`ss-best__row${fresh.includes(i + 1) ? " ss-best__row--new" : ""}`}>
            <span className="ss-best__place">{i + 1}</span>
            <span className="ss-best__name">{entry.name}</span>
            <span className="ss-best__score">{entry.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
