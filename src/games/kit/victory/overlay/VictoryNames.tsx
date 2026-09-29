"use client";
import type { CSSProperties, ReactNode } from "react";
import "./victory.css";

export interface VictoryName {
  name: string;
  /** The player's colour, for the glow behind their name. */
  colour?: string;
}

export interface VictoryNamesProps {
  /** The winner, or a whole team. */
  names: readonly VictoryName[];
  /** A short line over the names, like "Champion" or "Winners". */
  eyebrow?: string;
  /** A line under the names, like "By knockout in round 3". */
  detail?: string;
  /** Where on the screen: the lower third (default), the top, or the middle. */
  place?: "bottom" | "top" | "center";
  /** Anything extra under the detail, like a place list or a stat. */
  children?: ReactNode;
}

/**
 * The winners' names, big, over a victory scene: gold letters that rise
 * in one after another with a glow in each player's colour. It is only
 * the words. The scene behind is the game's own three.js.
 */
export function VictoryNames({ names, eyebrow, detail, place = "bottom", children }: VictoryNamesProps) {
  const longest = Math.max(1, ...names.map((n) => n.name.length));
  // Long names and teams get smaller letters, so the line never runs off a big screen.
  const size = Math.min(15, 90 / Math.max(6, longest)) * (names.length > 2 ? 0.6 : names.length > 1 ? 0.78 : 1);
  return (
    <div className={`kit-victory kit-victory--${place}`} aria-live="polite" style={{ ["--kit-victory-size" as string]: `${size}vmin` } as CSSProperties}>
      {eyebrow && <p className="kit-victory__eyebrow">{eyebrow}</p>}
      <div className="kit-victory__names">
        {names.map((winner, row) => (
          <h2 key={`${winner.name}-${row}`} className="kit-victory__name" style={{ ["--kit-victory-glow" as string]: winner.colour ?? "#f5c542" }} aria-label={winner.name}>
            {[...winner.name].map((letter, i) => (
              <span key={i} aria-hidden="true" style={{ animationDelay: `${180 + row * 160 + i * 45}ms` }}>
                {letter === " " ? " " : letter}
              </span>
            ))}
          </h2>
        ))}
      </div>
      {detail && <p className="kit-victory__detail">{detail}</p>}
      {children}
    </div>
  );
}
