"use client";
import { useEffect, useRef } from "react";
import type { LeaderEntry } from "./board";
import { boardLines } from "./rows";
import "./leaderboard.css";

export interface LeaderboardListProps {
  entries: readonly LeaderEntry[];
  /** The run to light up and scroll into view, such as the one just played. */
  highlight?: string | null;
  /** How a value reads, like "12,400" or "31.2 s". Scores with thousands separators by default. */
  format?: (value: number) => string;
  title?: string;
  /** Shown in place of the list while the board is empty. */
  empty?: string;
  /** For a game's own look. The colours and height are CSS variables, see `leaderboard.css`. */
  className?: string;
}

const plain = (value: number) => Math.round(value).toLocaleString();

/**
 * A game's leaderboard as a scrolling list: rank, name, an optional tag
 * and the value. The lit row is scrolled to the middle of the list, so
 * a player sees their run among its neighbours without hunting for it.
 */
export function LeaderboardList({ entries, highlight = null, format = plain, title = "Leaderboard", empty = "No runs yet", className = "" }: LeaderboardListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>("[aria-current='true']");
    // Scrolls the list only, never the page around it.
    if (list && row) list.scrollTop = row.offsetTop - (list.clientHeight - row.offsetHeight) / 2;
  }, [highlight, entries]);
  const lines = boardLines(entries, highlight);
  return (
    <section className={`kit-board ${className}`} aria-label={title}>
      <h3 className="kit-board__title">{title}</h3>
      {entries.length === 0 ? (
        <p className="kit-board__empty">{empty}</p>
      ) : (
        <ol ref={listRef} className="kit-board__list">
          {lines.map((line, i) =>
            line.kind === "gap" ? (
              <li key={`gap-${i}`} className="kit-board__gap">
                {line.skipped.toLocaleString()} more {line.skipped === 1 ? "run" : "runs"}
              </li>
            ) : (
              <li key={line.entry.id} className={`kit-board__row${line.entry.id === highlight ? " kit-board__row--me" : ""}`} aria-current={line.entry.id === highlight ? "true" : undefined}>
                <span className="kit-board__rank">{line.rank}</span>
                <span className="kit-board__name">{line.entry.name}</span>
                {line.entry.tag && <span className="kit-board__tag">{line.entry.tag}</span>}
                <span className="kit-board__value">{format(line.entry.value)}</span>
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}
