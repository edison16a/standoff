"use client";
import type { CSSProperties } from "react";
import "./split.css";

/** One player's view, as fractions of the whole screen from the top left. */
export interface SplitPane {
  name: string;
  color: string;
  rect: { x: number; y: number; w: number; h: number };
}

interface SplitMapProps {
  panes: readonly SplitPane[];
  /** Shape of the whole screen, so the little map matches the real split. */
  aspect?: number;
  className?: string;
}

/**
 * A small picture of the split screen with each player's name written big
 * in the pane they play in. With two to four views on one screen it answers
 * "which one is me" at a glance. Games place it with the rest of their side
 * panel; it draws nothing for a single view.
 */
export function SplitMap({ panes, aspect = 16 / 9, className }: SplitMapProps) {
  if (panes.length < 2) return null;
  return (
    <figure className={`split-map ${className ?? ""}`} style={{ aspectRatio: aspect }} aria-label="Who plays where">
      <span className="split-map__corner split-map__corner--tl" aria-hidden="true" />
      <span className="split-map__corner split-map__corner--tr" aria-hidden="true" />
      <span className="split-map__corner split-map__corner--bl" aria-hidden="true" />
      <span className="split-map__corner split-map__corner--br" aria-hidden="true" />
      {panes.map((pane) => (
        <span
          key={`${pane.name}-${pane.rect.x}-${pane.rect.y}`}
          className="split-map__pane"
          style={
            {
              "--pane": pane.color,
              left: `${pane.rect.x * 100}%`,
              top: `${pane.rect.y * 100}%`,
              width: `${pane.rect.w * 100}%`,
              height: `${pane.rect.h * 100}%`,
            } as CSSProperties
          }
        >
          <span className="split-map__name">{pane.name}</span>
        </span>
      ))}
    </figure>
  );
}
