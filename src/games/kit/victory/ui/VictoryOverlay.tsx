"use client";
import type { CSSProperties, ReactNode } from "react";
import "./victory.css";

export interface VictoryName {
  name: string;
  /** The player's or team's colour, for the bar under the name. */
  colour?: string;
}

export interface VictoryPlacing {
  place: number;
  name: string;
  colour?: string;
  /** A short fact on the right, like a time or a score. */
  detail?: string;
}

export interface VictoryOverlayProps {
  /** A small word over the names, like "Champion" or "Winners". */
  eyebrow?: string;
  /** The winner, or every name on the winning team. */
  names: readonly VictoryName[];
  /** A line under the names, like "by knockout in round 3". */
  subtitle?: string;
  /** Everyone's places, shown as a compact list. Optional. */
  placings?: readonly VictoryPlacing[];
  /** Where the names sit: across the top (the default) or the bottom. */
  align?: "top" | "bottom";
  /** Buttons, stats or anything else, in a row under everything. */
  children?: ReactNode;
}

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

/**
 * The winners' names over a victory scene: huge gold letters that drop
 * in one by one with a colour bar under each name, a line of detail,
 * an optional list of places and the game's own buttons. It leaves the
 * middle of the screen clear for the 3D scene behind it.
 */
export function VictoryOverlay({ eyebrow = "Champion", names, subtitle, placings, align = "top", children }: VictoryOverlayProps) {
  let letter = 0;
  const size = names.length > 2 ? "kit-victory__names--many" : names.length === 2 ? "kit-victory__names--two" : "";
  return (
    <div className={`kit-victory kit-victory--${align}`} aria-live="polite">
      <header className="kit-victory__head">
        <p className="kit-victory__eyebrow">{eyebrow}</p>
        <h2 className={`kit-victory__names ${size}`}>
          {names.map((entry, i) => (
            <span key={`${entry.name}-${i}`} className="kit-victory__name" style={{ "--who": entry.colour ?? "#f6c453" } as CSSProperties}>
              <span className="kit-victory__letters" aria-label={entry.name}>
                {Array.from(entry.name).map((char, k) => (
                  <span key={k} aria-hidden="true" className="kit-victory__letter" style={{ animationDelay: `${0.25 + letter++ * 0.045}s` }}>
                    {char === " " ? " " : char}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </h2>
        {subtitle && <p className="kit-victory__subtitle">{subtitle}</p>}
      </header>
      {(placings?.length || children) && (
        <footer className="kit-victory__foot">
          {placings && placings.length > 0 && (
            <ol className="kit-victory__places">
              {placings.map((p) => (
                <li key={`${p.place}-${p.name}`} className="kit-victory__place" style={{ "--who": p.colour ?? "#ffffff" } as CSSProperties}>
                  <span className="kit-victory__rank">{ORDINAL[p.place - 1] ?? `${p.place}th`}</span>
                  <span className="kit-victory__who">{p.name}</span>
                  {p.detail && <span className="kit-victory__detail">{p.detail}</span>}
                </li>
              ))}
            </ol>
          )}
          {children && <div className="kit-victory__actions">{children}</div>}
        </footer>
      )}
    </div>
  );
}
